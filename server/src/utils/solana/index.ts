import { AnchorProvider, Idl, Program, web3 } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { sha256 } from "js-sha256";
import { db } from "../../db/db.js";
import { configTable } from "../../db/schema.js";
import { logger } from "../logger.js";
import { SolanaProgram as StorachaSolProgram } from "./program.js";

const CONFIG_SEED = "config";
const DEPOSIT_SEED = "deposit";

interface EscrowVaultAccount {
  totalDeposits: BN;
  totalClaimed: BN;
}

interface ConfigAccount {
  adminKey: web3.PublicKey;
  ratePerBytePerDay: BN;
  minDurationDays: number;
  withdrawalWallet: web3.PublicKey;
}

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

let ADMIN_KEYPAIR: Keypair | null = null;
let CACHED_IDL: any = null;
let PROGRAM_ID: web3.PublicKey | null = null;

/**
 * Loads the IDL and sets up the program ID
 */
async function getIdlAndProgramId() {
  if (!CACHED_IDL) {
    if (!process.env.SOLANA_PROGRAM_IDL) {
      throw new Error("❌ SOLANA_PROGRAM_IDL environment variable is not set");
    }

    try {
      CACHED_IDL = JSON.parse(process.env.SOLANA_PROGRAM_IDL) as Idl;
    } catch (err) {
      throw new Error(
        `❌ Failed to parse SOLANA_PROGRAM_IDL: ${(err as Error).message}`,
      );
    }

    PROGRAM_ID = new web3.PublicKey((CACHED_IDL as any).address);
  }

  return { idl: CACHED_IDL!, programId: PROGRAM_ID! };
}

/**
 * Loads the admin keypair (used for program init)
 */
async function loadAdminKeypair(): Promise<Keypair> {
  if (ADMIN_KEYPAIR) return ADMIN_KEYPAIR;

  if (process.env.NODE_ENV === "production") {
    if (!process.env.ADMIN_KEYPAIR) {
      throw new Error("ADMIN_KEYPAIR env var not set in production");
    }
    const secretKey = Uint8Array.from(JSON.parse(process.env.ADMIN_KEYPAIR));
    ADMIN_KEYPAIR = Keypair.fromSecretKey(secretKey);
  } else {
    if (!process.env.ADMIN_KEYPAIR) {
      throw new Error(
        "ADMIN_KEYPAIR env var not set. Generate one with: solana-keygen new --outfile admin.json",
      );
    }
    const secretKey = Uint8Array.from(JSON.parse(process.env.ADMIN_KEYPAIR));
    ADMIN_KEYPAIR = Keypair.fromSecretKey(secretKey);
  }

  return ADMIN_KEYPAIR;
}

/**
 * Creates an Initialize Config Instruction (admin only
 * we'll look for a way to ensure this is programmatic from the server
 */
async function createInitializeConfigInstruction(
  adminPubkey: web3.PublicKey,
  ratePerBytePerDay: number,
  minDurationDays: number,
  withdrawalWallet: web3.PublicKey,
): Promise<TransactionInstruction> {
  const { idl, programId } = await getIdlAndProgramId();

  // the anchor provider needs a wallet arg. doesn't really do much
  // without it, the constructor breaks. we basically just need for the admin I/O
  const wallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {});
  const program = new Program(idl as StorachaSolProgram, provider);

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );

  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  // Create instruction with required accounts per IDL:
  // 1. config (writable, pda)
  // 2. escrowVault (writable, pda)
  // 3. admin (writable, signer)
  // 4. systemProgram
  // if we don't do this the program is nver initialized and we'd run into a lot of tranasction mismatch issues
  return await program.methods
    .initializeConfig(
      adminPubkey,
      new BN(ratePerBytePerDay),
      minDurationDays,
      withdrawalWallet,
    )
    .accounts({
      config: configPda,
      escrowVault: escrowVaultPda,
      admin: adminPubkey,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();
}

/**
 * Check if config is initialized, and initialize it if not
 */
export async function ensureConfigInitialized(): Promise<void> {
  const { programId } = await getIdlAndProgramId();

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );

  const configAccount = await connection.getAccountInfo(configPda);
  if (!configAccount) {
    logger.info("Config not found — initializing it now");

    const adminKeypair = await loadAdminKeypair();

    const { getSolPrice } =
      await import("../../services/price/sol-price.service.js");
    const { getAmountInLamportsFromUSD } = await import("../constant.js");

    const dbConfig = await db.select().from(configTable).limit(1);

    if (!dbConfig || dbConfig.length === 0) {
      throw new Error(
        "Database config not found. Please seed the config table first.",
      );
    }

    const config = dbConfig[0];

    // Set on-chain rate to 0 to disable validation
    // we should let the server calculate the actual cost dynamically based on:
    // - USD rate from database (3e-12 USD/byte/day)
    // - Current SOL price from Pyth
    // - File size and duration
    // We can't store fractional lamports on-chain, and the rate changes with SOL price,
    // so the on-chain program trusts the backend's calculation.
    const rateInLamports = 0;

    const initIx = await createInitializeConfigInstruction(
      new web3.PublicKey(config.adminKey),
      rateInLamports,
      config.minDurationDays,
      new web3.PublicKey(config.withdrawalWallet),
    );

    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction();
    tx.add(initIx);
    tx.feePayer = adminKeypair.publicKey;
    tx.recentBlockhash = blockhash;

    tx.sign(adminKeypair);

    try {
      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(sig, "confirmed");
      logger.info("Config initialized", { signature: sig });
    } catch (err) {
      logger.error("Failed to send init transaction", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  } else {
    logger.info("Config already exists — no update needed");
    // NOTE: We don't update the on-chain rate because our pricing is in USD (3e-12)
    // and the backend calculates lamports dynamically based on current SOL price.
    // The on-chain program only validates that the deposit amount is sufficient.
  }
}

/**
 * Creates a Deposit Instruction
 */
export async function createDepositInstruction(
  userPubkey: web3.PublicKey,
  cid: string,
  size: number,
  duration: number,
  depositAmountLamports: number,
): Promise<TransactionInstruction> {
  const { idl, programId } = await getIdlAndProgramId();
  const dummyWallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, dummyWallet as any, {});
  const program = new Program(idl as Idl, provider);

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );
  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  const cidHash = Buffer.from(sha256.digest(cid));
  const [depositPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(DEPOSIT_SEED), userPubkey.toBuffer(), cidHash],
    programId,
  );

  const durationNum = Number(duration);
  if (!Number.isFinite(durationNum)) {
    throw new Error("Invalid duration");
  }

  const depositAmountLamportsBN = new BN(depositAmountLamports.toString());

  return await program.methods
    .createDeposit(
      cid,
      new BN(size.toString()),
      new BN(durationNum.toString()),
      depositAmountLamportsBN,
    )
    .accounts({
      deposit: depositPda,
      escrowVault: escrowVaultPda,
      config: configPda,
      user: userPubkey,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();
}

/**
 * Creates a program instruction for renewing storage duration
 */
export async function extendStorageInstruction(
  cid: string,
  duration: number,
  extensionCost: number,
  userPubkey: web3.PublicKey,
): Promise<TransactionInstruction> {
  const { idl, programId } = await getIdlAndProgramId();
  const wallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {});
  const program = new Program(idl as Idl, provider);

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );
  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  const cidHash = Buffer.from(sha256.digest(cid));
  const [depositPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(DEPOSIT_SEED), userPubkey.toBuffer(), cidHash],
    programId,
  );

  const durationNum = Number(duration);
  if (!Number.isFinite(durationNum)) {
    throw new Error("Invalid duration");
  }

  const storageRenewalCostBN = new BN(extensionCost.toString());

  return await program.methods
    .extendStorageDuration(
      cid,
      new BN(durationNum.toString()),
      storageRenewalCostBN,
    )
    .accounts({
      deposit: depositPda,
      escrowVault: escrowVaultPda,
      config: configPda,
      user: userPubkey,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();
}

/**
 * Gets the escrow vault balance and account data
 */
export async function getEscrowBalance(): Promise<{
  totalDeposits: bigint;
  totalClaimed: bigint;
  availableBalance: bigint;
  accountLamports: bigint;
}> {
  const { idl, programId } = await getIdlAndProgramId();

  const wallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {});
  const program = new Program(idl as StorachaSolProgram, provider);

  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  const escrowAccount = await (
    program.account as unknown as {
      escrowVault: {
        fetch: (address: web3.PublicKey) => Promise<EscrowVaultAccount>;
      };
    }
  ).escrowVault.fetch(escrowVaultPda);
  const accountInfo = await connection.getAccountInfo(escrowVaultPda);

  if (!accountInfo) {
    throw new Error("Escrow vault account not found");
  }

  // solana expects all data stored on chain via an account to have a minimum balance to keep it alive
  // else, it'll be nuked!
  const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(
    accountInfo.data.length,
  );

  const accountLamports = BigInt(accountInfo.lamports);
  const totalDeposits = BigInt(escrowAccount.totalDeposits.toString());
  const totalClaimed = BigInt(escrowAccount.totalClaimed.toString());
  const availableBalance = accountLamports - BigInt(rentExemptMinimum);

  return {
    totalDeposits,
    totalClaimed,
    availableBalance: availableBalance > 0n ? availableBalance : 0n,
    accountLamports,
  };
}

export async function withdrawFees(amountLamports: bigint): Promise<string> {
  const { idl, programId } = await getIdlAndProgramId();
  const adminKeypair = await loadAdminKeypair();

  const wallet = {
    publicKey: adminKeypair.publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {});
  const program = new Program(idl as StorachaSolProgram, provider);

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );
  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  // Fetch config to get withdrawal wallet
  const configAccount = await (
    program.account as unknown as {
      config: { fetch: (address: web3.PublicKey) => Promise<ConfigAccount> };
    }
  ).config.fetch(configPda);
  const withdrawalWallet = configAccount.withdrawalWallet;

  const withdrawIx = await program.methods
    .withdrawFees(new BN(amountLamports.toString()))
    .accounts({
      escrowVault: escrowVaultPda,
      config: configPda,
      admin: adminKeypair.publicKey,
      withdrawalWallet: withdrawalWallet,
    })
    .instruction();

  const { blockhash } = await connection.getLatestBlockhash();

  const tx = new Transaction();
  tx.add(withdrawIx);
  tx.feePayer = adminKeypair.publicKey;
  tx.recentBlockhash = blockhash;

  tx.sign(adminKeypair);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(sig, "confirmed");

  logger.info("Fees withdrawn", {
    amount: amountLamports.toString(),
    signature: sig,
    withdrawalWallet: withdrawalWallet.toBase58(),
  });

  return sig;
}
