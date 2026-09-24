import {
  createMeshkitClient,
  init,
  setupGracefulShutdown,
} from '@ipfs-meshkit/meshkit'
import { logger } from '../../utils/logger.js'

type KuboClient = Awaited<ReturnType<typeof init>>['meshkit']

/**
 * Pool of initialised meshkit clients keyed by a stable, sorted URL string.
 * A new client is created only on the first request for a given node set;
 * subsequent calls for the same set are served from the cache.
 */
const _pool = new Map<string, KuboClient>()

function isLocalUrl(url: string): boolean {
  // Only treat URLs that explicitly target the standard Kubo daemon port (5001)
  // as "local".  A non-standard localhost port (e.g. :19999) is intentionally
  // treated as a remote node so the exact URL is actually tested.
  try {
    const u = new URL(url)
    return (
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost') &&
      (u.port === '5001' || u.port === '')
    )
  } catch {
    return false
  }
}

/**
 * Resolve the effective node URL list for a request.
 *
 * Priority order:
 *   1. Explicit array from the caller (X-Kubo-Node-URL request header)
 *   2. KUBO_NODES env var  — comma-separated list, supports local + remote
 *   3. KUBO_API_URL env var — single URL
 *   4. Hard-coded local fallback
 */
function resolveNodeUrls(override?: string[]): string[] {
  if (override?.length) return override

  if (process.env.KUBO_NODES) {
    return process.env.KUBO_NODES.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return [process.env.KUBO_API_URL ?? 'http://127.0.0.1:5001']
}

/**
 * Returns (or lazily creates) a meshkit client for the given set of nodes.
 *
 * Uses meshkit's built-in init() options:
 *   - { localNode: true }                    — local Kubo daemon only
 *   - { nodes: ['https://…'] }               — remote node(s), no local daemon
 *   - { localNode: true, nodes: ['https://…'] } — local primary + remote failover
 *
 * Meshkit health-checks all nodes at init time and routes through the first
 * healthy one with automatic failover on mid-operation failures.
 */
async function getClientForNodes(nodeUrls?: string[]): Promise<KuboClient> {
  const urls = resolveNodeUrls(nodeUrls)
  const cacheKey = [...urls].sort().join(',')

  if (_pool.has(cacheKey)) return _pool.get(cacheKey)!

  const localUrls = urls.filter(isLocalUrl)
  const remoteUrls = urls.filter((u) => !isLocalUrl(u))
  const needsLocalDaemon = localUrls.length > 0

  let meshkit: KuboClient

  if (needsLocalDaemon && remoteUrls.length > 0) {
    // Local daemon as primary + remote nodes as automatic failover
    const result = await init({ localNode: true, nodes: remoteUrls })
    if (result.localNode) setupGracefulShutdown(result.localNode)
    meshkit = result.meshkit
  } else if (needsLocalDaemon) {
    // Local daemon only
    const result = await init({ localNode: true })
    if (result.localNode) setupGracefulShutdown(result.localNode)
    meshkit = result.meshkit
  } else {
    // Remote node(s) only — no local daemon spawn
    const result = await init({ nodes: remoteUrls })
    meshkit = result.meshkit
  }

  _pool.set(cacheKey, meshkit)
  logger.info('meshkit: client pool entry created', { urls, cacheKey })
  return meshkit
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported service functions
// All accept an optional nodeUrl (from X-Kubo-Node-URL header) so that
// per-request node routing is supported without affecting other requests.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives a gateway base URL from a Kubo API URL.
 * Kubo RPC is on :5001 by convention; the gateway runs on :8080.
 * Only used when no explicit gateway URL is provided.
 */
function deriveGatewayFromApiUrl(apiUrl: string): string {
  return apiUrl.replace(':5001', ':8080')
}

/**
 * Returns a public gateway URL for a CID.
 *
 * Resolution order for the gateway base:
 *   1. Explicit gatewayBase arg  (from X-IPFS-Gateway-URL request header)
 *   2. Derived from nodeApiUrl   (swap :5001 → :8080)
 *   3. IPFS_GATEWAY env var
 *   4. Local gateway fallback    (http://127.0.0.1:8080)
 */
export function gatewayUrl(
  cid: string,
  filename?: string,
  gatewayBase?: string,
  nodeApiUrl?: string,
): string {
  const base =
    gatewayBase ??
    (nodeApiUrl ? deriveGatewayFromApiUrl(nodeApiUrl) : undefined) ??
    process.env.IPFS_GATEWAY ??
    'http://127.0.0.1:8080'

  return filename
    ? `${base}/ipfs/${cid}?filename=${encodeURIComponent(filename)}`
    : `${base}/ipfs/${cid}`
}

/**
 * Uploads every file in fileMap to the target Kubo node and pins each one
 * using meshkit.upload() + meshkit.pin().
 *
 * Returns the CID of the first (or only) file — the canonical identifier
 * stored on-chain and in the database.
 *
 * @param nodeUrl  Optional override from X-Kubo-Node-URL request header.
 *                 When absent, falls back to KUBO_NODES / KUBO_API_URL / local.
 */
export async function pinFiles(
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>,
  directoryName: string,
  nodeUrl?: string,
): Promise<string> {
  const client = await getClientForNodes(nodeUrl ? [nodeUrl] : undefined)

  let primaryCid = ''

  for (const [name, { buffer }] of Object.entries(fileMap)) {
    const cid = await client.upload(new Uint8Array(buffer))
    await client.pin(cid)

    if (!primaryCid) primaryCid = cid

    logger.info('meshkit: file uploaded and pinned', { name, cid, nodeUrl })
  }

  logger.info('meshkit: all files pinned', {
    directoryName,
    fileCount: Object.keys(fileMap).length,
    primaryCid,
    nodeUrl,
  })

  return primaryCid
}

/**
 * Unpins a CID from the target Kubo node.
 *
 * NOTE: meshkit does not expose an unpin method — the Kubo RPC endpoint is
 * called directly.  The nodeUrl param ensures the unpin hits the same node
 * the file was originally pinned to (stored as kuboNodeUrl in the uploads
 * table).
 */
export async function unpinCID(cid: string, nodeUrl?: string): Promise<void> {
  const kuboUrl =
    nodeUrl ??
    process.env.KUBO_NODES?.split(',')[0]?.trim() ??
    process.env.KUBO_API_URL ??
    'http://127.0.0.1:5001'

  const res = await fetch(
    `${kuboUrl}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}&recursive=true`,
    { method: 'POST' },
  )

  if (!res.ok) {
    const body = await res.text()
    if (
      body.toLowerCase().includes('not pinned') ||
      body.toLowerCase().includes('is not pinned')
    ) {
      logger.warn('meshkit: CID not pinned — skipping unpin', { cid, nodeUrl })
      return
    }
    throw new Error(`Kubo pin/rm failed (${res.status}): ${body}`)
  }

  logger.info('meshkit: CID unpinned', { cid, nodeUrl })
}

/**
 * Returns pin count and total repo size for the target node.
 *
 * Pin count uses meshkit.listPins().
 * Repo size uses the raw Kubo repo/stat endpoint (meshkit has no stats API).
 */
export async function getMeshkitUsage(nodeUrl?: string): Promise<{
  pinCount: number
  totalSizeBytes: number
}> {
  const client = await getClientForNodes(nodeUrl ? [nodeUrl] : undefined)
  const kuboUrl =
    nodeUrl ??
    process.env.KUBO_NODES?.split(',')[0]?.trim() ??
    process.env.KUBO_API_URL ??
    'http://127.0.0.1:5001'

  const [pins, statRes] = await Promise.all([
    client.listPins(),
    fetch(`${kuboUrl}/api/v0/repo/stat`, { method: 'POST' }),
  ])

  if (!statRes.ok) {
    throw new Error(`Kubo repo/stat failed (${statRes.status})`)
  }

  const stat = (await statRes.json()) as { RepoSize: number }

  return { pinCount: pins.length, totalSizeBytes: stat.RepoSize }
}

/**
 * Verifies that a Kubo node at nodeUrl is reachable and responsive.
 * Used by GET /health/ipfs?nodeUrl=… to power the UI "Test connection" button.
 *
 * Routes through getClientForNodes so the exact URL is resolved correctly:
 * - Standard local port (5001) → localNode: true
 * - Any other URL (including non-standard localhost ports) → init({ nodes })
 *   which health-checks the node at init time and throws if unreachable.
 */
export async function checkNodeHealth(nodeUrl: string): Promise<{
  ok: boolean
  nodeUrl: string
  pinCount: number
}> {
  const client = await getClientForNodes([nodeUrl])
  const pins = await client.listPins()
  return { ok: true, nodeUrl, pinCount: pins.length }
}
