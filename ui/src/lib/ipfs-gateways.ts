/**
 * Public IPFS gateways used for share / view links.
 * The Kubo node URL (kubo-render) is for pinning — recipients should get a
 * general public gateway so the link works without trusting our node.
 * Cloudflare is the default share gateway.
 */
export const PUBLIC_IPFS_GATEWAYS = [
  { id: 'cloudflare', label: 'Cloudflare', base: 'https://cloudflare-ipfs.com' },
  { id: 'ipfs-io', label: 'ipfs.io', base: 'https://ipfs.io' },
  { id: 'dweb', label: 'dweb.link', base: 'https://dweb.link' },
  { id: 'pinata', label: 'Pinata', base: 'https://gateway.pinata.cloud' },
  { id: 'w3s', label: 'w3s.link', base: 'https://w3s.link' },
] as const

export function publicGatewayUrl(
  cid: string,
  filename?: string,
  gatewayBase: string = PUBLIC_IPFS_GATEWAYS[0].base,
): string {
  const base = gatewayBase.replace(/\/+$/, '')
  return filename
    ? `${base}/ipfs/${cid}?filename=${encodeURIComponent(filename)}`
    : `${base}/ipfs/${cid}`
}
