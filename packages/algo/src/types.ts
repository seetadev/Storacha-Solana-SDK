/** Supported toju environments */
export type Environment = 'mainnet' | 'testnet'

/** Options passed to AlgoAgentClient constructor */
export interface AlgoAgentClientOptions {
  /**
   * Algorand account mnemonic (25-word BIP-39 phrase).
   * The account must hold sufficient ALGO to cover storage payments + transaction fees.
   */
  mnemonic: string

  /**
   * Target environment.
   * - 'mainnet' → Algorand Mainnet + api.toju.network
   * - 'testnet' → Algorand Testnet + staging-api.toju.network
   */
  environment: Environment

  /**
   * Override the default toju API endpoint.
   * Useful for local development or self-hosted deployments.
   */
  endpoint?: string

  /**
   * Override the default Algorand node (algod) URL.
   * Defaults to Algonode's free public node for the chosen environment.
   */
  algodServer?: string

  /**
   * API token for the Algorand node.
   * Leave empty ('') when using public nodes like algonode.cloud.
   */
  algodToken?: string
}

/** Options for a single store() call */
export interface StoreOptions {
  /** How many days to keep the file on IPFS */
  durationDays: number
}

/** Result returned after a successful file upload */
export interface StoreResult {
  /** IPFS Content Identifier of the stored file */
  cid: string
  /** ISO 8601 timestamp when storage expires */
  expiresAt: string
  /** Original filename as provided by the caller */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** Algorand transaction ID of the x402 payment */
  paymentTxId: string
}

/** Storage cost estimate returned by estimateStorageCost() */
export interface StorageCostEstimate {
  /** Cost denominated in ALGO */
  algo: string
  /** Equivalent cost in USD (informational, based on live ALGO/USD rate) */
  usd: string
  /** Cost in microALGO (1 ALGO = 1,000,000 microALGO) */
  microAlgo: number
}

/**
 * The x402 payment requirement object returned by the server in a 402 response.
 * Mirrors the x402 spec but typed for the Algorand scheme.
 */
export interface AlgoPaymentRequirement {
  scheme: 'algorand'
  network: 'mainnet' | 'testnet'
  /** Amount required in microALGO */
  maxAmountRequired: string
  asset: 'ALGO'
  recipient: string
  memo?: string
}

/** Raw shape of the 402 response body from the server */
export interface PaymentRequiredResponse {
  x402Version: number
  error: string
  accepts: AlgoPaymentRequirement[]
}
