const { NODE_ENV } = process.env;

export const ENDPOINT =
  NODE_ENV === 'development'
    ? 'http://localhost:5040'
    : 'https://storacha-solana-sdk-bshc.onrender.com';
