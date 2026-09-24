const GUEST_KEY = 'toju:meshkit-guest-id'

/**
 * Stable guest id for MeshKit uploads (no wallet / payment).
 * Fits uploads.deposit_key varchar(44).
 */
export function getMeshkitGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_KEY)
    if (existing && existing.length <= 44) return existing
  } catch {
    // ignore
  }

  const id = `mesh${crypto.randomUUID().replace(/-/g, '').slice(0, 40)}`
  try {
    localStorage.setItem(GUEST_KEY, id)
  } catch {
    // ignore
  }
  return id
}

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
