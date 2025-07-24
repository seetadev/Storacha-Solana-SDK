import { Address, getProgramDerivedAddress } from '@solana/kit';
import { CreateDepositArgs, FeeEstimationArgs, OnChainConfig } from './types';
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { configLayout, encodeDepositInstructionData } from './layouts';

const PROGRAM_ADDRESS = 'dummy_program_address' as Address; // this should provided by dhruv(?). need to sync.
const CONFIG_SEED = 'config'; // dummy stuff here too
const DEPOSIT_SEED = 'deposit';

const programConfig = async () => {
  const [configpda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [CONFIG_SEED],
  });

  return configpda;
};

function decodeConfigAccount(data: Buffer): OnChainConfig {
  const decoded = configLayout.decode(data);
  return {
    ratePerBytePerDay: decoded.ratePerBytePerDay,
    withdrawalWallet: decoded.withdrawalWallet.toBase58() as Address,
    minDurationDays: decoded.minDurationDays,
  };
}

/**Estimate total storage cost in lamports for a file upload based on its size and duration
 *
 * This reads the on-chain `ConfigAccount` to fetch the current rate per byte per day, and multiplies
 * it by the input file size and how long the file will be stored for to compute the fee.
 *
 * Lamports are the atomic unit for SOL, where 1 SOL has round a billion (1,000,000,000) lamports.
 *
 * @param args - The fee estimation input values.
 * @param args.size - Size of the file in bytes.
 * @param args.durationDays - Duration (in days) to store the file.
 * @param args.rpcUrl - Optional RPC URL, defaults to Solana Devnet
 *
 * @returns The estimated storage fee in lamports (as bigint).
 *
 * @throws If the on-chain `ConfigAccount` cannot be fetched or decoded.
 */
export async function estimateFees(args: FeeEstimationArgs): Promise<bigint> {
  const connection = new Connection(
    args.rpcUrl ?? clusterApiUrl('devnet'),
    'confirmed'
  );
  const configPda = await programConfig();

  const accountInfo = await connection.getAccountInfo(new PublicKey(configPda));
  if (!accountInfo) throw new Error('ConfigAccount not found on-chain');

  const config = decodeConfigAccount(accountInfo.data);
  const rate = BigInt(config.ratePerBytePerDay);
  const fee = BigInt(args.size) * BigInt(args.durationDays) * rate;

  return fee;
}

/**
 * Create a signed deposit transaction for uploading a file to Storacha.
 * The transaction must be signed and submitted by the dapp user externally.
 */
export async function createDepositTxn({
  cid,
  size,
  duration,
  payer,
  connection,
}: CreateDepositArgs): Promise<Transaction> {
  const config = await programConfig();

  /**
   * Derives the PDA for the Deposit account using the user's public key and the content CID.
   * matching the Anchor seed `[b"deposit", user.key().as_ref(), content_cid.as_bytes()]`
   */
  const depositPda = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    // we need to ensure anyone can derive the Deposit Account off-chain
    // from the supplied CID
    seeds: [DEPOSIT_SEED, payer.toBytes(), cid.bytes],
  });

  const { blockhash } = await connection.getLatestBlockhash();
  // args for the txn
  const txnInstructionData = encodeDepositInstructionData(
    cid.toString(),
    size,
    duration
  );

  const ix = new TransactionInstruction({
    programId: new PublicKey(PROGRAM_ADDRESS),
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(config), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(depositPda), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: txnInstructionData,
  });

  const tx = new Transaction();
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  tx.add(ix);

  return tx;
}
