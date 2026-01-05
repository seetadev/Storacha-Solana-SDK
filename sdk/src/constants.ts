export const ENDPOINT =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5040'
    : 'https://storacha-solana-sdk-bshc.onrender.com';

export const DAY_TIME_IN_SECONDS = 86400;

/** 1 SOL in Lamports */
export const ONE_BILLION_LAMPORTS = 1_000_000_000;
