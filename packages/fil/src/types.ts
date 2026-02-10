export interface DepositMetadata {
  depositAmount: string
  durationDays: number
  depositKey: string
  userEmail: string | null
  fileName: string | null
  fileType: string
  fileSize: number
  expiresAt: string
  paymentChain: PaymentChain
  paymentToken: PaymentToken
}

export type PaymentChain = 'sol' | 'fil'
export type PaymentToken = 'SOL' | 'USDFC'

export interface DepositResponse {
  message: string
  cid: string
  amountUSDFC: string
  recipientAddress: string
  fileCount: number
  totalSize: number
  files: Array<{ name: string; size: number; type: string }>
  depositMetadata: DepositMetadata
}
