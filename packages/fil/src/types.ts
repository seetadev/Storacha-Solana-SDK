export interface USDCTransferArgs {
  to: string
  amount: string
  payer: string
  network: 'mainnet' | 'calibration'
  signTransaction: (txData: any) => Promise<any>
  userEmail?: string
}

export interface USDCTransferResult {
  success: boolean
  transactionHash: string
  message: string
  error?: string
}

export interface CreateDepositArgs {
  file: File[]
  duration: number
  payer: string
  network: 'mainnet' | 'calibration'
  signTransaction: (txData: any) => Promise<any>
  userEmail?: string
}

export interface DepositResult {
  cid: string
  message?: string
  error?: string
  depositMetadata?: {
    depositAmount: number
    durationDays: number
    depositKey: string
    userEmail: string | null
    fileName: string | null
    fileType: string
    fileSize: number
    expiresAt: string
  }
}

export interface UploadResult {
  signature: string
  success: boolean
  cid: string
  url: string
  message: string
  fileInfo?: {
    filename: string
    size: number
    uploadedAt: string
    type: string
  }
  error?: string
}