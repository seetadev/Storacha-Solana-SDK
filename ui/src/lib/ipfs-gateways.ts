/**
 * Gateways offered on the share / view row.
 * The file is pinned only on the hosted Kubo node, so that node's gateway is
 * the one that can serve it. cloudflare-ipfs.com no longer runs an IPFS
 * gateway. ipfs.io, dweb.link, Pinata, and w3s.link look the CID up on the
 * public network and do not have this pin.
 */
const HOSTED_KUBO_GATEWAY = 'https://kubo-render.onrender.com'

export const PUBLIC_IPFS_GATEWAYS = [
  { id: 'kubo-render', label: 'kubo-render', base: HOSTED_KUBO_GATEWAY },
  { id: 'ipfs-io', label: 'ipfs.io', base: 'https://ipfs.io' },
  { id: 'dweb', label: 'dweb.link', base: 'https://dweb.link' },
  { id: 'pinata', label: 'Pinata', base: 'https://gateway.pinata.cloud' },
  { id: 'w3s', label: 'w3s.link', base: 'https://w3s.link' },
] as const

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

function hostnameOf(base: string): string {
  const trimmed = base.trim().toLowerCase()
  // Accept full URLs as well as bare hostnames ("localhost:8080").
  const match = trimmed.match(/^(?:https?:\/\/)?([^/:?#]+)/)
  return (match?.[1] ?? '').replace(/^\[|\]$/g, '')
}

/** True for loopback gateway bases (localhost, 127.0.0.1, …). */
function isLocalGatewayBase(base: string): boolean {
  return LOCAL_HOSTS.has(hostnameOf(base))
}

/**
 * Build a share / view link for a CID. The CID alone is sufficient for a
 * gateway to serve the content, so no `?filename=` is appended.
 */
export function publicGatewayUrl(
  cid: string,
  gatewayBase: string = PUBLIC_IPFS_GATEWAYS[0].base,
): string {
  // A node-local base (e.g. the active Kubo node's localhost gateway) can
  // never serve a share/view link — fall back to the default public gateway.
  const safeBase = isLocalGatewayBase(gatewayBase)
    ? PUBLIC_IPFS_GATEWAYS[0].base
    : gatewayBase
  const base = safeBase.replace(/\/+$/, '')
  return `${base}/ipfs/${cid}`
}

/**
 * Normalize a full gateway URL for share / view surfaces: rewrite loopback
 * origins to the default public gateway and drop the `?filename=` query
 * (the CID alone is sufficient to retrieve the content). Used for
 * server-provided URLs, which are built from the active Kubo node's gateway
 * and may be `http://localhost:8080/...` when the Local node is selected.
 * Other URLs pass through with only the filename param removed.
 */
export function sanitizeGatewayUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    parsed.searchParams.delete('filename')
    const path = `${parsed.pathname}${parsed.search}`
    if (LOCAL_HOSTS.has(host)) {
      return `${PUBLIC_IPFS_GATEWAYS[0].base}${path}`
    }
    return `${parsed.origin}${path}`
  } catch {
    return url
  }
}
