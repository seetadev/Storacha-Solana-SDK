import { init, setupGracefulShutdown } from '@ipfs-meshkit/meshkit'
import { logger } from '../../utils/logger.js'

type KuboClient = Awaited<ReturnType<typeof init>>['meshkit']

export type PinnedFile = {
  name: string
  cid: string
  mimetype: string
}

export type PinFilesResult = {
  primaryCid: string
  files: PinnedFile[]
}

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
 *   4. Hard-coded Render Kubo fallback
 */
function resolveNodeUrls(override?: string[]): string[] {
  if (override?.length) return override

  if (process.env.KUBO_NODES) {
    return process.env.KUBO_NODES.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return [process.env.KUBO_API_URL ?? 'https://kubo-render.onrender.com']
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

  if (needsLocalDaemon && remoteUrls.length === 0) {
    // Local daemon only — start or attach so dev machines without a
    // running Kubo process can still pin.
    const result = await init({ localNode: true })
    if (result.localNode) setupGracefulShutdown(result.localNode)
    meshkit = result.meshkit
  } else {
    // Talk to the listed RPC URLs. Do not spawn a daemon when a remote
    // node is available: a dead localhost must not block that failover,
    // and spawning `ipfs` throws before the remote node is tried.
    const result = await init({ nodes: urls })
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
    'https://kubo-render.onrender.com'

  return filename
    ? `${base}/ipfs/${cid}?filename=${encodeURIComponent(filename)}`
    : `${base}/ipfs/${cid}`
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  const causeText =
    cause instanceof Error
      ? cause.message
      : typeof cause === 'string'
        ? cause
        : ''
  if (causeText && !error.message.includes(causeText)) {
    return `${error.message} (${causeText})`
  }
  return error.message
}

function isTransientFetch(error: unknown): boolean {
  const msg = describeError(error).toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('timed out') ||
    msg.includes('socket') ||
    msg.includes('network')
  )
}

function candidateNodeUrls(nodeUrl?: string): string[] {
  const urls: string[] = []
  const push = (url?: string) => {
    const trimmed = url?.trim()
    if (trimmed && !urls.includes(trimmed)) urls.push(trimmed)
  }
  push(nodeUrl)
  for (const url of resolveNodeUrls()) push(url)
  return urls
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Pin via Kubo's HTTP API. Used when meshkit.upload() fails with a transport
 * error ("fetch failed") after the node already answered a health check.
 * Encryption stays on the meshkit path — this only sends plaintext bytes.
 */
async function pinWithKuboHttp(
  nodeUrl: string,
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>,
  directoryName: string,
): Promise<PinFilesResult> {
  const base = nodeUrl.replace(/\/+$/, '')
  const files: PinnedFile[] = []

  for (const [name, { buffer, mimetype }] of Object.entries(fileMap)) {
    const form = new FormData()
    form.append('file', new Blob([Buffer.from(buffer)]), name)

    const addRes = await fetch(
      `${base}/api/v0/add?cid-version=1&pin=false&quieter=true`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) },
    )
    if (!addRes.ok) {
      const body = await addRes.text().catch(() => '')
      throw new Error(
        `Kubo add failed (${addRes.status}) at ${base}: ${body.slice(0, 180)}`,
      )
    }

    const raw = (await addRes.text()).trim()
    const lastLine = raw.split('\n').filter(Boolean).at(-1) ?? ''
    const parsed = JSON.parse(lastLine) as { Hash?: string }
    const cid = parsed.Hash
    if (!cid) throw new Error(`Kubo add at ${base} did not return a CID`)

    const pinRes = await fetch(
      `${base}/api/v0/pin/add?arg=${encodeURIComponent(cid)}`,
      { method: 'POST', signal: AbortSignal.timeout(60_000) },
    )
    if (!pinRes.ok) {
      const body = await pinRes.text().catch(() => '')
      throw new Error(
        `Kubo pin failed (${pinRes.status}) at ${base}: ${body.slice(0, 180)}`,
      )
    }

    files.push({ name, cid, mimetype })
    logger.info('kubo http: file uploaded and pinned', {
      name,
      cid,
      nodeUrl: base,
    })
  }

  const primaryCid = files[0]?.cid ?? ''
  logger.info('kubo http: all files pinned', {
    directoryName,
    fileCount: files.length,
    primaryCid,
    nodeUrl: base,
  })
  return { primaryCid, files }
}

async function pinWithMeshkit(
  client: KuboClient,
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>,
  directoryName: string,
  encryptPassword?: string,
): Promise<PinFilesResult> {
  const uploadOpts = encryptPassword
    ? { encrypt: { password: encryptPassword } }
    : undefined
  const files: PinnedFile[] = []

  for (const [name, { buffer, mimetype }] of Object.entries(fileMap)) {
    let cid = ''
    let lastError: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        cid = await client.upload(new Uint8Array(buffer), uploadOpts)
        await client.pin(cid)
        lastError = undefined
        break
      } catch (err) {
        lastError = err
        logger.warn('meshkit: upload attempt failed', {
          name,
          attempt,
          error: describeError(err),
        })
        if (attempt === 3 || !isTransientFetch(err)) break
        await sleep(1000 * attempt)
      }
    }
    if (!cid || lastError) {
      throw lastError instanceof Error
        ? lastError
        : new Error(describeError(lastError))
    }
    files.push({ name, cid, mimetype })
    logger.info('meshkit: file uploaded and pinned', { name, cid })
  }

  return {
    primaryCid: files[0]?.cid ?? '',
    files,
  }
}

/**
 * Uploads every file in fileMap to the target Kubo node and pins each one
 * using meshkit.upload() + meshkit.pin() — the MeshKit Kubo round-trip.
 *
 * Each file gets its own CID (MeshKit uploads raw bytes, not directories).
 * `primaryCid` is the first file's CID for DB / legacy callers.
 *
 * The node from the request is tried first, then KUBO_NODES / the hosted
 * fallback. A dead localhost no longer fails the upload when another node
 * is reachable. Plaintext uploads fall back to Kubo's HTTP API when
 * meshkit's client reports "fetch failed".
 *
 * @param encryptPassword  Optional AES-256-GCM password (MeshKit encrypt option).
 * @param nodeUrl  Optional override from X-Kubo-Node-URL request header.
 */
export async function pinFiles(
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>,
  directoryName: string,
  nodeUrl?: string,
  encryptPassword?: string,
): Promise<PinFilesResult> {
  const urls = candidateNodeUrls(nodeUrl)
  let meshkitError: unknown

  try {
    const client = await getClientForNodes(urls)
    const pinned = await pinWithMeshkit(
      client,
      fileMap,
      directoryName,
      encryptPassword,
    )
    logger.info('meshkit: all files pinned', {
      directoryName,
      fileCount: pinned.files.length,
      primaryCid: pinned.primaryCid,
      nodeUrl,
      encrypted: Boolean(encryptPassword),
    })
    return pinned
  } catch (err) {
    meshkitError = err
    logger.warn('meshkit: pin failed', {
      error: describeError(err),
      urls,
      encrypted: Boolean(encryptPassword),
    })
  }

  if (encryptPassword) {
    throw new Error(
      `Could not pin encrypted files: ${describeError(meshkitError)}`,
    )
  }

  let httpError: unknown = meshkitError
  for (const url of urls) {
    try {
      return await pinWithKuboHttp(url, fileMap, directoryName)
    } catch (err) {
      httpError = err
      logger.warn('kubo http: pin failed', { url, error: describeError(err) })
    }
  }

  throw new Error(`Could not pin files: ${describeError(httpError)}`)
}

/**
 * Retrieves file bytes by CID via meshkit.retrieve().
 * Pass `password` when the content was uploaded with MeshKit encryption.
 */
export async function retrieveFile(
  cid: string,
  nodeUrl?: string,
  password?: string,
): Promise<Uint8Array> {
  const client = await getClientForNodes(nodeUrl ? [nodeUrl] : undefined)
  const retrieveOpts = password ? { password } : undefined
  const bytes = await client.retrieve(cid, retrieveOpts)
  logger.info('meshkit: file retrieved', {
    cid,
    byteLength: bytes.byteLength,
    nodeUrl,
    decrypted: Boolean(password),
  })
  return bytes
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
 * Uses a lightweight POST /api/v0/id probe (not full meshkit init + listPins),
 * so hosted nodes like Render stay green even on cold starts / large pinsets.
 */
export async function checkNodeHealth(nodeUrl: string): Promise<{
  ok: boolean
  nodeUrl: string
  pinCount: number
}> {
  const base = nodeUrl.replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)

  try {
    const idRes = await fetch(`${base}/api/v0/id`, {
      method: 'POST',
      signal: controller.signal,
    })

    if (!idRes.ok) {
      const body = await idRes.text().catch(() => '')
      throw new Error(
        `Kubo /id returned ${idRes.status}${body ? `: ${body.slice(0, 160)}` : ''}`,
      )
    }

    // Optional pin count — don't fail health if this endpoint is slow/restricted
    let pinCount = 0
    try {
      const pinsRes = await fetch(`${base}/api/v0/pin/ls?type=recursive`, {
        method: 'POST',
        signal: AbortSignal.timeout(8_000),
      })
      if (pinsRes.ok) {
        const pinsJson = (await pinsRes.json()) as {
          Keys?: Record<string, unknown>
        }
        pinCount = pinsJson.Keys ? Object.keys(pinsJson.Keys).length : 0
      }
    } catch (err) {
      logger.warn('meshkit: pin count skipped during health check', {
        nodeUrl,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return { ok: true, nodeUrl, pinCount }
  } finally {
    clearTimeout(timer)
  }
}
