import { ethers } from 'ethers'
import { ERC20_ABI, USDFC_ADDRESSES, getEndpointForNetwork } from './constants'
import { USDCTransferArgs, USDCTransferResult, CreateDepositArgs, UploadResult } from './types'

export async function createUSDFCTransfer(
  args: USDCTransferArgs
): Promise<USDCTransferResult> {
  const { to, amount, payer, network, signTransaction } = args

  try {
    const tokenAddress = USDFC_ADDRESSES[network]
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI)

    const parsedAmount = ethers.parseUnits(amount, 6)
    const txData = contract.interface.encodeFunctionData('transfer', [to, parsedAmount])

    const transaction = {
      to: tokenAddress,
      data: txData,
      from: payer
    }

    const signedTx = await signTransaction(transaction)

    return {
      success: true,
      transactionHash: signedTx.hash || '',
      message: 'USDFC transfer completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      transactionHash: '',
      message: 'USDFC transfer failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function createDepositTxn(
  args: CreateDepositArgs
): Promise<UploadResult> {
  const { file, duration, payer, network, signTransaction, userEmail } = args
  const apiEndpoint = getEndpointForNetwork(network)

  try {
    const formData = new FormData()
    file.forEach((f) => formData.append('file', f))
    formData.append('duration', duration.toString())
    formData.append('publicKey', payer)
    if (userEmail) {
      formData.append('userEmail', userEmail)
    }

    const depositReq = await fetch(`${apiEndpoint}/upload/deposit`, {
      method: 'POST',
      body: formData,
    })

    if (!depositReq.ok) throw new Error('Failed to get deposit instructions')

    const depositRes = await depositReq.json()

    const transferResult = await createUSDFCTransfer({
      to: depositRes.paymentAddress,
      amount: depositRes.amount,
      payer,
      network,
      signTransaction
    })

    if (!transferResult.success) {
      throw new Error(transferResult.error || 'USDFC transfer failed')
    }

    const confirmRes = await fetch(`${apiEndpoint}/upload/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid: depositRes.cid,
        transactionHash: transferResult.transactionHash,
        depositMetadata: depositRes.depositMetadata,
      }),
    })

    if (!confirmRes.ok) {
      throw new Error('Failed to confirm upload on server')
    }

    const uploadForm = new FormData()
    file.forEach((f) => uploadForm.append('file', f))

    const isMultipleFiles = file.length > 1
    const uploadEndpoint = isMultipleFiles ?
      `${apiEndpoint}/upload/files?cid=${encodeURIComponent(depositRes.cid)}` :
      `${apiEndpoint}/upload/file?cid=${encodeURIComponent(depositRes.cid)}`

    const fileUploadReq = await fetch(uploadEndpoint, {
      method: 'POST',
      body: uploadForm,
    })

    if (!fileUploadReq.ok) {
      throw new Error('File upload failed')
    }

    const fileUploadRes = await fileUploadReq.json()

    return {
      signature: transferResult.transactionHash,
      success: true,
      cid: depositRes.cid,
      url: fileUploadRes.object?.url || '',
      message: fileUploadRes.object?.message || 'Upload completed successfully',
      fileInfo: fileUploadRes.object?.fileInfo ? {
        filename: fileUploadRes.object.fileInfo.filename || '',
        size: fileUploadRes.object.fileInfo.size || 0,
        uploadedAt: fileUploadRes.object.fileInfo.uploadedAt || '',
        type: fileUploadRes.object.fileInfo.type || '',
      } : undefined,
    }
  } catch (error) {
    return {
      signature: '',
      success: false,
      cid: '',
      url: '',
      message: 'Upload failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}