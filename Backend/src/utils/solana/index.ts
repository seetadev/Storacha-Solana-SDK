import { AnchorProvider, Idl, Program, web3 } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs/promises";
import { sha256 } from "js-sha256";
import path from "path";
import { fileURLToPath } from "url";
import { SolanaPrograms as StorachaSolProgram } from "./program.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_SEED = "config";
const DEPOSIT_SEED = "deposit";

// we'll switch this interchangeably between mainnet/testnet/localnet/devnet
const connection = new Connection(
  "https://api.testnet.solana.com",
  "confirmed",
);

let PROGRAM_KEYPAIR: Keypair | null = null;
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
 * Loads the Program Signer Keypair from local file (once)
 */
async function loadProgramKeypair(): Promise<Keypair> {
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
