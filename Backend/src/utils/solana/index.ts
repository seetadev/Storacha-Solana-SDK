import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import idl from "../../../../solana-programs/target/idl/solana_programs.json" with { type: "json" };
import { encodeDepositInstructionData } from "./layouts.js";
import fs from "fs/promises";
import path from "path";
import { sha256 } from "js-sha256";
import { fileURLToPath } from "url";

const PROGRAM_ADDRESS = new PublicKey(idl.address);
const CONFIG_SEED = "config";
const DEPOSIT_SEED = "deposit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const connection = new Connection("http://127.0.0.1:8899", "confirmed"); // will update for mainnet

let PROGRAM_KEYPAIR: Keypair | null = null;

/**
 * Loads the Program Signer Keypair from local file (once) we'll change this
 * when we decide to publish on mainnet
 */
export async function loadProgramKeypair(): Promise<Keypair> {
  if (PROGRAM_KEYPAIR) return PROGRAM_KEYPAIR;

  const keypairData = await fs.readFile(
    path.resolve(
      __dirname,
      // we'll update this to use a secret manager or something when it is time
      "../../../../solana-programs/target/deploy/solana_programs-keypair.json",
    ),
    "utf-8",
  );

  PROGRAM_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(keypairData)),
  );

  return PROGRAM_KEYPAIR;
}

/**
 * Derives a PDA for given seeds and program address
 */
async function getProgramDerivedAddress(
  seeds: (Buffer | Uint8Array)[],
): Promise<PublicKey> {
  const [pda] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ADDRESS);
  return pda;
}

/**
 * Creates a Deposit Instruction (unsigned)
 */
export async function createDepositInstruction(
  userPubkey: PublicKey,
  cid: string,
  size: number,
  duration: number,
): Promise<TransactionInstruction> {
  const configPda = await getProgramDerivedAddress([Buffer.from(CONFIG_SEED)]);
  // each seed passed to the `findProgramAddressSync` method must be <= 32 bytes
  // CIDs can be greater than 32 bytes, and when that happens, deruving the program address fails
  const cidHash = Buffer.from(sha256.digest(cid));

  const depositPda = await getProgramDerivedAddress([
    Buffer.from(DEPOSIT_SEED),
    userPubkey.toBytes(),
    cidHash,
  ]);

  const ixData = encodeDepositInstructionData(cid, size, duration);

  return new TransactionInstruction({
    programId: PROGRAM_ADDRESS,
    keys: [
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: depositPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixData,
  });
}

/**
 * Sends and confirms a transaction signed by the backend signer
 */
export async function sendTransaction(ixs: TransactionInstruction[]) {
  const programKeypair = await loadProgramKeypair();

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction().add(...ixs);
  tx.feePayer = programKeypair.publicKey;
  tx.recentBlockhash = blockhash;

  const signature = await connection.sendTransaction(tx, [programKeypair]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("Transaction Signature:", signature);
  return signature;
}
