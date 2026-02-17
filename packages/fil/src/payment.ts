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
        errorData.error || 'Failed to get deposit instructions from server',
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

    return {
      success: true,
      transactionHash: txHash,
      cid: depositRes.cid,
      url: `https://w3s.link/ipfs/${depositRes.cid}`,
      message: depositRes.message,
      fileInfo: depositRes.files[0]
        ? {
            type: depositRes.files[0].type,
            size: depositRes.files[0].size,
            uploadedAt: new Date().toISOString(),
            filename: depositRes.files[0].name,
          }
        : undefined,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

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
    throw new Error(errorData.error || 'Payment verification request failed')
  }

  return await verifyReq.json()
}
