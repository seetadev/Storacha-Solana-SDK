import { Environment } from './types'

/** toju backend API endpoints per environment */
export const ENDPOINTS: Record<Environment, string> = {
  mainnet: 'https://api.toju.network',
  testnet: 'https://staging-api.toju.network',
}

/**
 * Algorand network identifiers used in the x402 payment requirement object.
 * These are sent back by the server in the 402 response so the client
 * knows which network to build the transaction on.
 */
export const ALGO_NETWORKS: Record<Environment, string> = {
  mainnet: 'algorand:mainnet',
  testnet: 'algorand:testnet',
}

/**
 * Free public Algorand algod (node) endpoints via Algonode.
 * Suitable for development and low-traffic production use.
 * For high-throughput production, replace with Nodely or a dedicated node.
 */
export const ALGOD_SERVERS: Record<Environment, string> = {
  mainnet: 'https://mainnet-api.algonode.cloud',
  testnet: 'https://testnet-api.algonode.cloud',
}

/**
 * Algonode public nodes require no API token.
 * If you switch to a private node (Nodely, PureStake, etc.),
 * set ALGOD_TOKEN in your environment and pass it via AlgoAgentClientOptions.algodToken.
 */
export const ALGOD_TOKEN_DEFAULT = ''

/**
 * Number of block rounds to wait for transaction confirmation before timing out.
 * At ~3.9s per round, 10 rounds ≈ 39 seconds max wait.
 */
export const CONFIRMATION_ROUNDS = 10

/**
 * Upload route on the toju server that is protected by the Algorand x402 middleware.
 * POST /upload/algo-agent?size=<bytes>&duration=<days>
 */
export const UPLOAD_ROUTE = '/upload/algo-agent'

/**
 * Pricing route used to estimate cost before committing to an upload.
 * GET /pricing/quote?size=<bytes>&duration=<days>&chain=algo
 */
export const PRICING_ROUTE = '/pricing/quote'
