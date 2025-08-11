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
 *   size: number;
 *   duration: number;
 *   payer: PublicKey;
 *   connection: Connection;
 *   depositAmount: number;
 *   apiUrl?: string (optional, override endpoint)
 * }
 * @returns Transaction
 */
export async function createDepositTxn({
  cid,
  size,
  duration,
  payer,
  connection,
  depositAmount,
  apiUrl,
}: CreateDepositArgs & { depositAmount: number; apiUrl: string }) : Promise<Transaction> {
  // Fetch instruction from API
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: payer.toBase58(),
      cid,
      size,
      duration,
      depositAmount,
    }),
  });

  if (!res.ok) {
    let err = 'Unknown error';
    try {
      const data = await res.json();
      err = data.error || err;
    } catch {}
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
