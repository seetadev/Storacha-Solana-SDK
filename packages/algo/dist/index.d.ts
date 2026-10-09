/** Supported toju environments */
type Environment = 'mainnet' | 'testnet'
/** Options passed to AlgoAgentClient constructor */
interface AlgoAgentClientOptions {
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
interface StoreOptions {
  /** How many days to keep the file on IPFS */
  durationDays: number
}
/** Result returned after a successful file upload */
interface StoreResult {
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
interface StorageCostEstimate {
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
interface AlgoPaymentRequirement {
  scheme: 'algorand'
  network: 'mainnet' | 'testnet'
  /** Amount required in microALGO */
  maxAmountRequired: string
  asset: 'ALGO'
  recipient: string
  memo?: string
}
/** Raw shape of the 402 response body from the server */
interface PaymentRequiredResponse {
  x402Version: number
  error: string
  accepts: AlgoPaymentRequirement[]
}

declare class AlgoAgentClient {
  private readonly apiEndpoint
  private readonly environment
  private readonly signer
  private readonly x402
  private readonly network
  constructor({
    mnemonic,
    environment,
    endpoint,
    algodServer,
    algodToken,
  }: AlgoAgentClientOptions)
  /**
   * The Algorand address derived from the provided mnemonic.
   */
  get address(): string
  /**
   * Store a file on IPFS. Payment in ALGO is handled automatically
   * via the x402 protocol with GoPlausible's facilitator.
   *
   * Flow (handled by @x402/fetch + @x402/avm):
   *   1. POST to /upload/algo-agent → server returns 402 with payment requirements
   *   2. @x402/avm builds and signs the Algorand payment transaction group
   *   3. GoPlausible facilitator verifies and settles on-chain (~3s)
   *   4. @x402/fetch retries with X-PAYMENT header containing the signed payload
   *   5. Server pins file to IPFS and returns the result
   *
   * @example
   * const { cid, expiresAt, paymentTxId } = await client.store(file, { durationDays: 30 })
   */
  store(file: File, { durationDays }: StoreOptions): Promise<StoreResult>
  /**
   * Estimate the ALGO cost for storing a file before committing to an upload.
   *
   * @example
   * const { algo, usd, microAlgo } = await client.estimateStorageCost(1_000_000, 30)
   * console.log(`Cost: ${algo} ALGO (~$${usd})`)
   */
  estimateStorageCost(
    sizeInBytes: number,
    durationDays: number,
  ): Promise<StorageCostEstimate>
}
/** Convenience factory */
declare function createAlgoAgentClient(
  options: AlgoAgentClientOptions,
): AlgoAgentClient

export {
  AlgoAgentClient,
  type AlgoAgentClientOptions,
  type AlgoPaymentRequirement,
  type Environment,
  type PaymentRequiredResponse,
  type StorageCostEstimate,
  type StoreOptions,
  type StoreResult,
  createAlgoAgentClient,
}
