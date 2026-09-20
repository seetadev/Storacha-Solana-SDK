import type { NodeHealthResult } from '@/lib/types'
import useSWR from 'swr'

const REVALIDATE_MS = 30_000

async function fetchNodeHealth(
  apiBase: string,
  nodeUrl: string,
): Promise<NodeHealthResult> {
  const url = new URL(`${apiBase}/health/ipfs`)
  url.searchParams.set('nodeUrl', nodeUrl)

  const res = await fetch(url.toString())
  const body = (await res.json()) as NodeHealthResult
  return body
}

/**
 * Checks whether a Kubo node is reachable using the backend
 * GET /health/ipfs?nodeUrl=... endpoint.
 *
 * @param apiBase   Backend base URL, e.g. http://localhost:3000
 * @param nodeUrl   Kubo RPC URL to test, e.g. http://127.0.0.1:5001
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
