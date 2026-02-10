// TODO:
// Solana-specific imports removed.
// Signature / transaction types will be replaced with Filecoin equivalents.
import {
  CreateDepositArgs,
  DepositResult,
  RenewStorageDurationArgs,
  StorageRenewalCost,
  StorageRenewalResult,
  UploadResult,
} from './types'

/**
 * Creates a storage deposit.
 *
 * TODO:
 * Previously created and sent a Solana transaction.
 * We will reuse the same API-driven flow for Filecoin message creation & signing.
 */
export async function createDepositTxn(
  args: CreateDepositArgs,
  apiEndpoint: string,
): Promise<UploadResult> {
  const { file, duration, payer, signTransaction, userEmail } = args

  try {
    const formData = new FormData()
    file.forEach((f) => formData.append('file', f))
    formData.append('duration', duration.toString())

    // TODO:
    // Replace Solana public key with Filecoin address string
    formData.append('payer', payer.toString())

    if (userEmail) {
      formData.append('userEmail', userEmail)
    }

    const isMultipleFiles = file.length > 1

    // Step 1: Request deposit instructions from backend
    const depositReq = await fetch(`${apiEndpoint}/upload/deposit`, {
      method: 'POST',
      body: formData,
    })

    if (!depositReq.ok) {
      throw new Error('Failed to get deposit instructions')
    }

    const depositRes: DepositResult = await depositReq.json()

    if (!depositRes.instructions || !depositRes.instructions.length) {
      throw new Error('No deposit instructions returned')
    }

    /**
     * TODO:
     * Replace Solana instruction → transaction building with:
     * - Filecoin message creation
     * - Filecoin wallet signing
     * - Message submission to network
     */
    const signedMessage = await signTransaction({
      instructions: depositRes.instructions,
    })

    /**
     * TODO:
     * Replace Solana signature with Filecoin message CID
     */
    const messageCid = signedMessage.messageCid

    // Step 2: Confirm deposit on backend
    const confirmRes = await fetch(`${apiEndpoint}/upload/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid: depositRes.cid,
        transactionHash: messageCid,
        depositMetadata: depositRes.depositMetadata,
      }),
    })

    if (!confirmRes.ok) {
      const err = await confirmRes.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to confirm upload on server')
    }

    // Step 3: Upload file data
    const uploadForm = new FormData()
    file.forEach((f) => uploadForm.append('file', f))

    const uploadUrl = isMultipleFiles
      ? `${apiEndpoint}/upload/files?cid=${encodeURIComponent(depositRes.cid)}`
      : `${apiEndpoint}/upload/file?cid=${encodeURIComponent(depositRes.cid)}`

    const fileUploadReq = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadForm,
    })

    if (!fileUploadReq.ok) {
      let err = 'Unknown error'
      try {
        const data: DepositResult = await fileUploadReq.json()
        err = data.message || data.error || err
      } catch {}
      throw new Error('Deposit API error: ' + err)
    }

    const fileUploadRes: Pick<DepositResult, 'object' | 'cid' | 'message'> =
      await fileUploadReq.json()

    return {
      success: true,
      cid: depositRes.cid,
      signature: messageCid,
      url: fileUploadRes.object?.url,
      message: fileUploadRes.object?.message,
      fileInfo: fileUploadRes.object?.fileInfo,
    }
  } catch (error) {
    console.error('Deposit failed:', error)

    return {
      success: false,
      cid: '',
      signature: '',
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
 * NOTE:
 * This is chain-agnostic and requires no Solana changes.
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
    )

    if (!request.ok) {
      const res = await request.json()
      throw new Error(res.message || 'Failed to get storage renewal cost')
    }

    return await request.json()
  } catch (error) {
    console.error('Failed to get storage renewal cost', error)
    return null
  }
}

/**
 * Renew storage duration for an existing upload
 *
 * TODO:
 * Replace Solana transaction with Filecoin renewal message
 */
export async function renewStorageTxn(
  args: RenewStorageDurationArgs,
  apiEndpoint: string,
): Promise<UploadResult> {
  const { cid, duration, payer, signTransaction } = args

  // Step 1: Ask backend to prepare renewal instructions
  const renewalReq = await fetch(`${apiEndpoint}/storage/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cid,
      duration,
      payer: payer.toString(),
    }),
  })

  if (!renewalReq.ok) {
    const err = await renewalReq.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to create renewal')
  }

  const renewalData: StorageRenewalResult = await renewalReq.json()

  /**
   * TODO:
   * Replace Solana instruction execution with:
   * - Filecoin message signing
   * - Network submission
   */
  const signedMessage = await signTransaction({
    instructions: renewalData.instructions,
  })

  const messageCid = signedMessage.messageCid

  // Step 2: Confirm renewal with backend
  const confirmRenewal = await fetch(
    `${apiEndpoint}/storage/confirm-renewal`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid,
        duration,
        transactionHash: messageCid,
      }),
    },
  )

  if (!confirmRenewal.ok) {
    console.error('Failed to confirm renewal on backend')
  }

  return {
    success: true,
    cid,
    signature: messageCid,
    url: `https://w3s.link/ipfs/${cid}`,
    message: 'Storage renewed successfully',
  }
}
