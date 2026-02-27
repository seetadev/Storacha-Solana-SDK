import {
  CreateDepositArgs,
  DepositResponse,
  RenewalPaymentDetails,
  StorageRenewalCost,
  StorageRenewalParams,
  UploadResult,
  VerifyPaymentArgs,
  VerifyPaymentResponse,
} from './types'

/**
 * Creates a deposit by uploading files and initiating USDFC payment
 *
 * Flow:
 * 1. Upload files to server
 * 2. Server calculates cost and returns deposit info
 * 3. User sends USDFC to recipient address
 * 4. Verify payment on-chain
 * 5. Server confirms and stores on Storacha
 *
 * @param args - CreateDepositArgs
 * @param apiEndpoint - Backend API URL
 * @returns UploadResult with transaction details
 */
export async function createDepositTxn(
  args: CreateDepositArgs,
  apiEndpoint: string,
): Promise<UploadResult> {
  const { file, duration, userAddress, sendTransaction, userEmail } = args

  try {
    const formData = new FormData()
    file.forEach((f) => formData.append('file', f))
    formData.append('duration', duration.toString())
    formData.append('userAddress', userAddress)
    if (userEmail) {
      formData.append('userEmail', userEmail)
    }

    const depositReq = await fetch(`${apiEndpoint}/upload/deposit-usdfc`, {
      method: 'POST',
      body: formData,
    })

    if (!depositReq.ok) {
      const errorData = await depositReq.json().catch(() => ({}))
      throw new Error(
        errorData.message ||
          errorData.error ||
          'Failed to get deposit instructions from server',
      )
    }

    const depositRes: DepositResponse = await depositReq.json()

    const txHash = await sendTransaction({
      to: depositRes.recipientAddress,
      amount: depositRes.amountUSDFC,
      contractAddress: depositRes.usdfcContractAddress,
    })

    const verifyRes = await verifyPayment(
      {
        transactionHash: txHash,
        cid: depositRes.cid,
        depositMetadata: depositRes.depositMetadata,
      },
      apiEndpoint,
    )

    if (!verifyRes.verified)
      throw new Error(
        verifyRes.message || 'Payment verification failed on server',
      )

    const uploadData = new FormData()
    file.forEach((file) => uploadData.append('file', file))
    let fileUploadReq
    const isMultipleFiles = file.length > 1

    if (isMultipleFiles) {
      fileUploadReq = await fetch(
        `${apiEndpoint}/upload/files?cid=${encodeURIComponent(depositRes.cid)}`,
        {
          method: 'POST',
          body: uploadData,
        },
      )
    } else {
      fileUploadReq = await fetch(
        `${apiEndpoint}/upload/file?cid=${encodeURIComponent(depositRes.cid)}`,
        {
          method: 'POST',
          body: uploadData,
        },
      )
    }

    if (!fileUploadReq.ok) {
      let err = 'Unknown error'
      try {
        const data: DepositResponse = await fileUploadReq.json()
        err = data.message || err
      } catch {}
      throw new Error('Deposit API error: ' + err)
    }

    const uploadResponse: Pick<DepositResponse, 'object' | 'cid' | 'message'> =
      await fileUploadReq?.json()

    return {
      success: true,
      transactionHash: txHash,
      cid: depositRes.cid,
      url: uploadResponse.object.url,
      message: uploadResponse.object.message,
      fileInfo: uploadResponse.object
        ? {
            type: uploadResponse?.object?.fileInfo?.type || '',
            size: uploadResponse?.object?.fileInfo?.size || 0,
            uploadedAt: uploadResponse?.object?.fileInfo?.uploadedAt || '',
            filename: uploadResponse?.object?.fileInfo?.filename || '',
          }
        : undefined,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return {
      success: false,
      transactionHash: '',
      cid: '',
      url: '',
      error: errorMessage,
      message: errorMessage,
    }
  }
}

/**
 * Verifies USDFC payment on-chain
 *
 * @param args - VerifyPaymentArgs
 * @param apiEndpoint - Backend API URL
 * @returns VerifyPaymentResponse
 */
export async function verifyPayment(
  args: VerifyPaymentArgs,
  apiEndpoint: string,
): Promise<VerifyPaymentResponse> {
  const { transactionHash, cid, depositMetadata } = args

  const verifyReq = await fetch(`${apiEndpoint}/upload/fil/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionHash,
      cid,
      depositMetadata,
    }),
  })

  if (!verifyReq.ok) {
    const errorData = await verifyReq.json().catch(() => ({}))
    throw new Error(
      errorData.message ||
        errorData.error ||
        'Payment verification request failed',
    )
  }

  return await verifyReq.json()
}

/**
 * Get the cost of renewing storage for a CID
 *
 * @param cid - Content identifier of the file to renew
 * @param duration - Number of additional days
 * @param apiEndpoint
 * @returns StorageRenewalCost with cost breakdown and expiration details
 */
export async function getStorageRenewalCost(
  cid: string,
  duration: number,
  apiEndpoint: string,
): Promise<StorageRenewalCost> {
  const response = await fetch(
    `${apiEndpoint}/storage/renewal-cost?cid=${encodeURIComponent(cid)}&duration=${duration}&chain=fil`,
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to get renewal cost')
  }

  return await response.json()
}

/**
 * Renew storage for an existing upload by paying with USDFC
 *
 * Flow:
 * 1. Get renewal payment details from server
 * 2. User sends USDFC transfer on-chain
 * 3. Server verifies payment and extends storage duration
 *
 * @param args - StorageRenewalParams
 * @param apiEndpoint - Backend API URL
 * @returns Renewal confirmation with updated deposit
 */
export async function renewStorageTxn(
  args: StorageRenewalParams,
  apiEndpoint: string,
): Promise<{ verified: boolean; message: string; deposit: unknown }> {
  const { cid, duration, userAddress, sendTransaction } = args

  const renewReq = await fetch(`${apiEndpoint}/storage/renew-usdfc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid, duration, userAddress }),
  })

  if (!renewReq.ok) {
    const errorData = await renewReq.json().catch(() => ({}))
    throw new Error(
      errorData.message || 'Failed to get renewal payment details',
    )
  }

  const renewalDetails: RenewalPaymentDetails = await renewReq.json()

  const txHash = await sendTransaction({
    to: renewalDetails.recipientAddress,
    amount: renewalDetails.cost.usdfc,
    contractAddress: renewalDetails.usdfcContractAddress,
  })

  const confirmReq = await fetch(
    `${apiEndpoint}/storage/confirm-renewal-usdfc`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid,
        transactionHash: txHash,
        duration,
        userAddress,
      }),
    },
  )

  if (!confirmReq.ok) {
    const errorData = await confirmReq.json().catch(() => ({}))
    throw new Error(errorData.message || 'Renewal payment verification failed')
  }

  return await confirmReq.json()
}
