import { CreateDepositArgs } from './types';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

/**
 * Calls the deposit API for on-chain storage and returns a Transaction
 * which must be signed and sent externally by the user.
 *
 * @param params - {
 *   cid: string;
 *   file: File;
 *   duration: number;
 *   payer: PublicKey;
 *   connection: Connection;
 * }
 * @returns Transaction
 */
export async function createDepositTxn({
  file,
  duration,
  payer,
  connection,
}: CreateDepositArgs): Promise<Transaction> {


  const formData = new FormData();

  // Validate input parameters
  formData.append('file', file);
  formData.append('duration', duration.toString());
  formData.append('publicKey', payer.toBase58());


  // Fetch instruction from API
  const res = await fetch('https://storacha-solana-sdk-bshc.onrender.com/api/user/uploadFile', {
    method: 'POST',
    body: formData,
  });

if (!res.ok) {
  let err = 'Unknown error';
  try {
    const data = await res.json();
    err = data.error || err;
  } catch { }
  throw new Error('Deposit API error: ' + err);
}

const body = await res.json();
if (!body.instructions || !body.instructions.length) {
  throw new Error('No instructions from deposit API');
}

// Build transaction from provided instruction(s)
const latestBlockhash = await connection.getLatestBlockhash('confirmed');
const tx = new Transaction();
tx.recentBlockhash = latestBlockhash.blockhash;
tx.feePayer = payer;

const depositIx = body.instructions[0];
tx.add(
  new TransactionInstruction({
    programId: new PublicKey(depositIx.programId),
    keys: depositIx.keys.map((k: any) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(depositIx.data, 'base64'),
  })
);

return tx;
}
