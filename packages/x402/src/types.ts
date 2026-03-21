export type Environment = 'mainnet' | 'sepolia'

export interface AgentClientOptions {
  /** Agent's EVM private key — must hold USDC on Base */
  privateKey: `0x${string}`
  /** Target environment. 'mainnet' uses Base + api.toju.network, 'sepolia' uses Base Sepolia + staging-api.toju.network */
  environment: Environment
  /** Override the default toju API endpoint. You may never need to do this. */
  endpoint?: string
}

export interface StoreOptions {
  /** Storage duration in days */
  durationDays: number
}

export interface StoreResult {
  /** IPFS CID of the stored file */
  cid: string
  /** ISO timestamp when storage expires */
  expiresAt: string
  /** Original file name */
  fileName: string
  /** File size in bytes */
  fileSize: number
}

export interface StorageCostEstimate {
  /** Cost in USDC (1:1 with USD) */
  usdc: string
  /** Cost in USD */
  usd: string
}
