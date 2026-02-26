export type PaymentChain = 'sol' | 'fil'

export interface UploadResultInfo {
  cid: string
  fileName?: string
  fileSize: number
  fileCount: number
  duration: number
  costInSOL: number
  costInUSD: number
  costInUSDFC: number
  paymentChain: PaymentChain
  transactionHash: string
}

export type State = 'idle' | 'loading' | 'uploading'
/** uploaded data status (for filtering) */
export type Filter = 'all' | 'active' | 'expired'

export interface UploadedFile {
  id: string
  cid: string
  filename: string
  size: number
  type: string
  url: string
  uploadedAt: string
  signature: string
  duration: number
  cost: number
  status: 'active' | 'expired' | 'pending'
}

export interface DashboardStats {
  totalFiles: number
  totalStorage: number
  totalSpent: number
  activeFiles: number
}
