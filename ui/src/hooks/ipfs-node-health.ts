import type { NodeHealthResult } from '@/lib/types'
import useSWR from 'swr'

const REVALIDATE_MS = 30_000
const PROBE_TIMEOUT_MS = 20_000

function normalizeKuboBase(nodeUrl: string): string {
  return nodeUrl.replace(/\/+$/, '')
}

/**
 * Probe Kubo directly via POST /api/v0/id.
 * Hosted nodes (e.g. Render) typically allow browser CORS; this avoids depending
 * on a local API server being up just to show node status.
 */
async function probeKuboDirect(nodeUrl: string): Promise<NodeHealthResult> {
  const base = normalizeKuboBase(nodeUrl)
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const res = await fetch(`${base}/api/v0/id`, {
      method: 'POST',
      signal: controller.signal,
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        nodeUrl,
        latencyMs,
        error: `Kubo /id returned ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`,
      }
    }

    // Best-effort pin count (ignore failures — reachability already confirmed)
    let pinCount: number | undefined
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
    } catch {
      // ignore
    }

    return { ok: true, nodeUrl, latencyMs, pinCount }
  } catch (err) {
    return {
      ok: false,
      nodeUrl,
      latencyMs: Date.now() - start,
      error:
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Timed out waiting for Kubo'
            : err.message
          : 'Node unreachable',
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fallback: ask the backend to probe (useful for localhost Kubo without CORS).
 */
async function probeViaBackend(
  apiBase: string,
  nodeUrl: string,
): Promise<NodeHealthResult> {
  const url = new URL(`${apiBase}/health/ipfs`)
  url.searchParams.set('nodeUrl', nodeUrl)

  const res = await fetch(url.toString())
  const body = (await res.json()) as NodeHealthResult
  return body
}

async function fetchNodeHealth(
  apiBase: string,
  nodeUrl: string,
): Promise<NodeHealthResult> {
  const direct = await probeKuboDirect(nodeUrl)
  if (direct.ok) return direct

  // Local daemons often block browser CORS — try backend proxy next.
  if (apiBase) {
    try {
      const viaApi = await probeViaBackend(apiBase, nodeUrl)
      if (viaApi.ok) return viaApi
      return {
        ...viaApi,
        error:
          viaApi.error ||
          direct.error ||
          'Node unreachable (direct + API probe failed)',
      }
    } catch {
      // keep direct error
    }
  }

  return direct
}

/**
 * Checks whether a Kubo node is reachable.
 * Prefers a direct browser probe; falls back to GET /health/ipfs.
 */
export function useIpfsNodeHealth(apiBase: string, nodeUrl: string) {
  const key = nodeUrl ? ['ipfs-node-health', apiBase, nodeUrl] : null

  const { data, error, isLoading, mutate } = useSWR<NodeHealthResult>(
    key,
    ([, base, node]) => fetchNodeHealth(base as string, node as string),
    {
      refreshInterval: REVALIDATE_MS,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )

  return {
    health: data,
    isChecking: isLoading,
    isHealthy: data?.ok === true,
    error: error ?? (data?.ok === false ? data.error : undefined),
    recheck: mutate,
  }
}
