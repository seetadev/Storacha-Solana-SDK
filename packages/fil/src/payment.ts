import {
  CreateDepositArgs,
  DepositResponse,
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
