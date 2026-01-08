const ENDPOINTS = {
  local: 'http://localhost:5040',
  staging: 'https://storacha-solana-sdk-o9t9.onrender.com',
  production: 'https://keep-sdk-prod.onrender.com',
} as const;

function getEndpoint(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    return ENDPOINTS.local;
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development')
    return ENDPOINTS.local;

  return ENDPOINTS.production;
}

export const ENDPOINT = getEndpoint();

export const DAY_TIME_IN_SECONDS = 86400;

/** 1 SOL in Lamports */
export const ONE_BILLION_LAMPORTS = 1_000_000_000;
