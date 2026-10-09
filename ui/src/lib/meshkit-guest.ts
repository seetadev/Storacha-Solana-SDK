export function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL

  const configuredNetwork =
    import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta'

  // Local Vite UI is :3000; API server defaults to :5040 in this monorepo
  if (configuredNetwork === 'local' || import.meta.env.DEV) {
    return 'http://localhost:5040'
  }

  return configuredNetwork === 'mainnet-beta'
    ? 'https://api.toju.network'
    : 'https://staging-api.toju.network'
}
