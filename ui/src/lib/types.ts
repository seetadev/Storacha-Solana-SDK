export type PaymentChain = 'sol' | 'fil'

/** Extended chain type that includes Sepolia (Ethereum testnet). */
export type AppChain = 'sol' | 'fil' | 'sep'

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

// ─── Kubo node configuration ─────────────────────────────────────────────────

export interface KuboNodeConfig {
  id: string
  label: string
  /** Kubo RPC API URL, e.g. http://kubo.example.com:5001 */
  apiUrl: string
  /** Public IPFS gateway URL, e.g. http://kubo.example.com:8080 */
  gatewayUrl: string
}

export interface NodeHealthResult {
  ok: boolean
  nodeUrl: string
  pinCount?: number
  latencyMs?: number
  error?: string
}
