import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs/promises";
import path from "path";
import { sha256 } from "js-sha256";
import { fileURLToPath } from "url";
import { Idl, Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import BN from "bn.js";
import idl from "../../../../solana-programs/target/idl/solana_programs.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_SEED = "config";
const DEPOSIT_SEED = "deposit";

// we'll switch this interchangeably between mainnet/testnet/localnet/devnet
export const connection = new Connection(
  "https://api.testnet.solana.com",
  "confirmed",
);

let PROGRAM_KEYPAIR: Keypair | null = null;
let CACHED_IDL: any = null;
let PROGRAM_ID: web3.PublicKey | null = null;

/**
 * Loads the IDL and sets up the program ID
 */
export async function getIdlAndProgramId() {
  if (!CACHED_IDL) {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.SOLANA_PROGRAM_IDL) {
        throw new Error("SOLANA_PROGRAM_IDL env var not set in production");
      }
      CACHED_IDL = JSON.parse(process.env.SOLANA_PROGRAM_IDL);
    } else {
      CACHED_IDL = idl;
    }

    PROGRAM_ID = new web3.PublicKey(CACHED_IDL.address);
  }

  return { idl: CACHED_IDL, programId: PROGRAM_ID! };
}

/**
 * Loads the Program Signer Keypair from local file (once)
 */
export async function loadProgramKeypair(): Promise<Keypair> {
  if (PROGRAM_KEYPAIR) return PROGRAM_KEYPAIR;

  if (process.env.NODE_ENV === "production") {
    if (!process.env.PROGRAM_KEYPAIR) {
      throw new Error("PROGRAM_KEYPAIR env var not set in production");
    }
    const secretKey = Uint8Array.from(JSON.parse(process.env.PROGRAM_KEYPAIR));
    PROGRAM_KEYPAIR = Keypair.fromSecretKey(secretKey);
  } else {
    const keypairData = await fs.readFile(
      path.resolve(
        __dirname,
        "../../../../solana-programs/target/deploy/solana_programs-keypair.json",
      ),
      "utf-8",
    );
    PROGRAM_KEYPAIR = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(keypairData)),
    );
  }

  return PROGRAM_KEYPAIR;
}

/**
 * Creates an Initialize Config Instruction (admin only
 * we'll look for a way to ensure this is programmatic from the server
 */
export async function createInitializeConfigInstruction(
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
  const program = new Program(idl as Idl, provider);

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
    console.log("Config not found — initializing it now...");

    const adminKeypair = await loadProgramKeypair();

    const initIx = await createInitializeConfigInstruction(
      adminKeypair.publicKey,
      1000,
      1,
      adminKeypair.publicKey,
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
      console.log(`✅ Config initialized. Tx: ${sig}`);
    } catch (err) {
      console.error("Failed to send init transaction:", err);
      throw err;
    }
  } else {
    console.log("✅ Config already exists — no backend init needed.");
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
  depositAmountSol: number,
): Promise<TransactionInstruction> {
  const { idl, programId } = await getIdlAndProgramId();

  const dummyWallet = {
    publicKey: web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, dummyWallet as any, {});
  const program = new Program(idl as Idl, provider);

  const depositAmountLamports = Math.floor(depositAmountSol * LAMPORTS_PER_SOL);

  const [configPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId,
  );

  const [escrowVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow")],
    programId,
  );

  // each seed passed to the `findProgramAddressSync` method must be <= 32 bytes
  // CIDs can be greater than 32 bytes, and when that happens, deriving the program address fails
  const cidHash = Buffer.from(sha256.digest(cid));
  const [depositPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(DEPOSIT_SEED), userPubkey.toBuffer(), cidHash],
    programId,
  );

  return await program.methods
    .createDeposit(cid, new BN(size), duration, new BN(depositAmountLamports))
    .accounts({
      deposit: depositPda,
      escrowVault: escrowVaultPda,
      config: configPda,
      user: userPubkey,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();
}
