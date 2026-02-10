const ENDPOINTS = {
  local: 'http://localhost:5040',
  staging: 'https://staging-api.toju.network',
  production: 'https://api.toju.network',
} as const

/**
 * Determines the appropriate backend endpoint based on Solana RPC URL
 */
export function getEndpointForRpc(rpcUrl: string): string {
  const url = rpcUrl.toLowerCase()

  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return ENDPOINTS.local
  }

  if (url.includes('mainnet')) {
    return ENDPOINTS.production
  }

  if (url.includes('testnet') || url.includes('devnet')) {
    return ENDPOINTS.staging
  }

  return ENDPOINTS.production
}

export const DAY_TIME_IN_SECONDS = 86400

