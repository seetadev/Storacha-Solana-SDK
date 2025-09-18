import { Signature } from '@solana/kit';
import { CreateDepositArgs, DepositResult, UploadResult } from './types';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { ENDPOINT } from './constants';

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
  signTransaction,
}: CreateDepositArgs): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration', duration.toString());
    formData.append('publicKey', payer.toBase58());

    let uploadErr;

    const depositReq = await fetch(`${ENDPOINT}/api/solana/deposit`, {
      method: 'POST',
      body: formData,
    });
    if (!depositReq.ok) throw new Error('Failed to get deposit instructions');

    const depositRes: DepositResult = await depositReq.json();
    if (!depositRes.instructions || !depositRes.instructions.length)
      throw new Error('No instructions from deposit API');

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const instructions = depositRes.instructions[0];

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(instructions.programId),
      keys: instructions.keys.map((k) => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(instructions.data, 'base64'),
    });

    const tx = new Transaction();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = payer;
    tx.add(depositInstruction);

    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false, // not sure we should be disabling this verification step
        preflightCommitment: 'confirmed',
      }
    );
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      console.error(
        'Failed to confirm this transaction:',
        confirmation.value.err
      );
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    if (depositRes.error) {
      uploadErr = depositRes.error;
    }

    const uploadForm = new FormData();
    uploadForm.append('file', file);

    // calls the upload functionality on our server with the file when deposit is succesful
    const fileUploadReq = await fetch(
      `${ENDPOINT}/api/user/uploadFile?cid=${encodeURIComponent(depositRes.cid)}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!fileUploadReq.ok) {
      let err = 'Unknown error';
      try {
        const data: DepositResult = await fileUploadReq.json();
        err = data.message || data.error || err;
      } catch {}
      throw new Error('Deposit API error: ' + err);
    }

    const fileUploadRes: Pick<DepositResult, 'object' | 'cid' | 'message'> =
      await fileUploadReq.json();

    return {
      signature: signature as Signature,
      success: true,
      cid: depositRes.cid,
      url: fileUploadRes.object.url,
      message: fileUploadRes.object.message,
      fileInfo: fileUploadRes.object
        ? {
            filename: fileUploadRes.object.fileInfo?.filename || '',
            size: fileUploadRes?.object?.fileInfo?.size || 0,
            uploadedAt: fileUploadRes?.object?.fileInfo?.uploadedAt || '',
            type: fileUploadRes?.object?.fileInfo?.type || '',
          }
        : undefined,
    };
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return {
      signature: '' as Signature,
      success: false,
      cid: '',
      url: '',
      message: '',
      fileInfo: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
