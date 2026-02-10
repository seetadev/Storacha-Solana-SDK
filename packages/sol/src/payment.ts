import { Signature } from '@solana/kit'
import {
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  CreateDepositArgs,
  DepositResult,
  RenewStorageDurationArgs,
  StorageRenewalCost,
  StorageRenewalResult,
  UploadResult,
} from './types'

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
export async function createDepositTxn(
  args: CreateDepositArgs,
  apiEndpoint: string,
): Promise<UploadResult> {
  const { file, duration, payer, connection, signTransaction, userEmail } = args
  try {
    const formData = new FormData()
    file.forEach((f) => formData.append('file', f))
    formData.append('duration', duration.toString())
    formData.append('publicKey', payer.toBase58())
    if (userEmail) {
      formData.append('userEmail', userEmail)
    }

    const isMultipleFiles = file.length > 1

    let _uploadErr

    const depositReq = await fetch(`${apiEndpoint}/upload/deposit`, {
      method: 'POST',
      body: formData,
    })
    if (!depositReq.ok) throw new Error('Failed to get deposit instructions')

    const depositRes: DepositResult = await depositReq.json()
    if (!depositRes.instructions || !depositRes.instructions.length)
      throw new Error('No instructions from deposit API')

    const latestBlockhash = await connection.getLatestBlockhash('confirmed')
    const instructions = depositRes.instructions[0]

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(instructions.programId),
      keys: instructions.keys.map((k) => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(instructions.data, 'base64'),
    })

    const tx = new Transaction()
    tx.recentBlockhash = latestBlockhash.blockhash
    tx.feePayer = payer
    tx.add(depositInstruction)

    const signedTx = await signTransaction(tx)
    let signature: string

    try {
      signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false, // not sure we should be disabling this verification step
        preflightCommitment: 'confirmed',
      })
    } catch (err) {
      if (err instanceof SendTransactionError) {
        const logs = err.logs ?? []

        const isDuplicateUpload = logs.some((log) =>
          log.includes('already in use'),
        )

        if (isDuplicateUpload)
          throw new Error(
            'This file has already been uploaded. You can find it in your dashboard.',
          )

        throw new Error(
          'Transaction failed during simulation. Please try again.',
        )
      }

      throw err
    }
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed',
    )

    if (confirmation.value.err) {
      console.error(
        'Failed to confirm this transaction:',
        confirmation.value.err,
      )
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
      )
    }

    let confirmRes
    try {
      confirmRes = await fetch(`${apiEndpoint}/upload/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid: depositRes.cid,
          transactionHash: signature,
          depositMetadata: depositRes.depositMetadata,
        }),
      })

      if (!confirmRes.ok) {
        const errorData = await confirmRes.json().catch(() => ({}))
        throw new Error(
          errorData.message || 'Failed to confirm upload on server',
        )
      }
    } catch (err) {
      console.error('Failed to confirm upload:', err)
      throw new Error(
        `Upload confirmation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    if (depositRes.error) {
      _uploadErr = depositRes.error
    }

    const uploadForm = new FormData()
    file.forEach((f) => uploadForm.append('file', f))

    let fileUploadReq
    // calls the upload functionality on our server with the file when deposit is successful
    if (isMultipleFiles) {
      fileUploadReq = await fetch(
        `${apiEndpoint}/upload/files?cid=${encodeURIComponent(depositRes.cid)}`,
        {
          method: 'POST',
          body: uploadForm,
        },
      )
    } else {
      fileUploadReq = await fetch(
        `${apiEndpoint}/upload/file?cid=${encodeURIComponent(depositRes.cid)}`,
        {
          method: 'POST',
          body: uploadForm,
        },
      )
    }

    if (!fileUploadReq.ok) {
      let err = 'Unknown error'
      try {
        const data: DepositResult = await fileUploadReq.json()
        err = data.message || data.error || err
      } catch {}
      throw new Error('Deposit API error: ' + err)
    }

    const fileUploadRes: Pick<DepositResult, 'object' | 'cid' | 'message'> =
      await fileUploadReq?.json()

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
    }
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return {
      signature: '' as Signature,
      success: false,
      cid: '',
      url: '',
      message: '',
      fileInfo: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get cost estimate for renewing storage duration
 *
 * @param {string} cid - Content identifier of the uploaded data to renew
 * @param {number} duration - Number of additional days to extend storage
 *
 * @example
 * const quote = await client.getRenewalQuote('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', 30);
 * console.log(`Renewal cost: ${quote.costInSOL} SOL`);
 *
 * @returns {Promise<StorageRenewalCost | null>} Cost breakdown and expiration details
 */
export async function getStorageRenewalCost(
  cid: string,
  duration: number,
  apiEndpoint: string,
): Promise<StorageRenewalCost | null> {
  try {
    const request = await fetch(
      `${apiEndpoint}/storage/renewal-cost?cid=${encodeURIComponent(
        cid,
      )}&duration=${duration}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    )

    if (!request.ok) {
      const response = await request.json()
      throw new Error(response.message || 'Failed to get storage renewal cost')
    }

    return await request.json()
  } catch (error) {
    console.error('Failed to get storage renewal cost', error)
    return null
  }
}

/**
 * Renew storage for an existing deposit
 *
 * @param {Object} params
 * @param {string} params.cid - Content identifier of the uploaded data to renew
 * @param {number} params.duration - Number of additional days to extend storage
 * @param {PublicKey} params.payer - Wallet public key paying for the renewal
 * @param {(tx: Transaction) => Promise<Transaction>} params.signTransaction - Transaction signing callback
 *
 * @example
 * const { publicKey, signTransaction } = useSolanaWallet();
 * const result = await client.renewStorage({
 *   cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
 *   additionalDays: 30,
 *   payer: publicKey,
 *   signTransaction,
 * });
 *
 * @returns {Promise<UploadResult>} Result of the renewal transaction
 */
export async function renewStorageTxn(
  args: RenewStorageDurationArgs,
  apiEndpoint: string,
): Promise<UploadResult> {
  const { cid, duration, payer, connection, signTransaction } = args
  const renewalTransactionIx = await fetch(`${apiEndpoint}/storage/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cid,
      duration,
      publicKey: payer.toString(),
    }),
  })

  if (!renewalTransactionIx.ok) {
    const errorData = await renewalTransactionIx.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to create renewal transaction')
  }

  const renewalData: StorageRenewalResult = await renewalTransactionIx.json()
  const transaction = new Transaction()

  renewalData.instructions.forEach((ix) => {
    transaction.add({
      programId: new PublicKey(ix.programId),
      keys: ix.keys.map((key) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(ix.data, 'base64'),
    })
  })

  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payer

  const signed = await signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  const confirmRenewalTx = await fetch(
    `${apiEndpoint}/storage/confirm-renewal`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid,
        duration,
        transactionHash: signature,
      }),
    },
  )

  if (!confirmRenewalTx.ok) {
    console.error('Failed to confirm renewal')
  }

  return {
    success: true,
    cid,
    signature: signature as Signature,
    url: `https://w3s.link/ipfs/${cid}`,
    message: 'Storage renewed successfully',
  }
}
