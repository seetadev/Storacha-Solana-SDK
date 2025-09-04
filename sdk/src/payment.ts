import { Signature } from '@solana/kit';
import { CreateDepositArgs, DepositResult, UploadResult } from './types';
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
  signTransaction,
}: CreateDepositArgs): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration', duration.toString());
    formData.append('publicKey', payer.toBase58());

    // calls the upload functionality on our server with the file to upload and
    // returns a response with the transaction instruction data
    const fileUploadReq = await fetch(
      'http://localhost:5040/api/user/uploadFile',
      {
        method: 'POST',
        body: formData,
      }
    );
    let uploadErr;

    if (!fileUploadReq.ok) {
      let err = 'Unknown error';
      try {
        const data: DepositResult = await fileUploadReq.json();
        err = data.message || data.error || err;
      } catch {}
      throw new Error('Deposit API error: ' + err);
    }

    const body: DepositResult = await fileUploadReq.json();
    if (!body.instructions || !body.instructions.length) {
      throw new Error('No instructions from deposit API');
    }

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const instructions = body.instructions[0];

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(instructions.programId),
      keys: instructions.keys.map((k) => ({
        pubkey: new PublicKey(k.pubKey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(instructions.data, 'base64'),
    });

    if (body.error) {
      uploadErr = body.error;
    }

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

    return {
      signature: signature as Signature,
      success: true,
      cid: body.cid,
      url: body.object.url,
      message: body.message,
      fileInfo: body.object
        ? {
            filename: body.object.fileInfo?.filename || '',
            size: body?.object?.fileInfo?.size || 0,
            uploadedAt: body?.object?.fileInfo?.uploadedAt || '',
            type: body?.object?.fileInfo?.type || '',
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
      cid: "",
      url: '',
      message: '',
      fileInfo: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
