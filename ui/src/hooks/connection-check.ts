import { useCallback, useState } from 'react'

export type ConnectionQuality = 'good' | 'slow' | 'offline' | 'unknown'

interface ConnectionCheckResult {
  quality: ConnectionQuality
  latency: number | null
  isChecking: boolean
  checkConnection: () => Promise<ConnectionQuality>
}

interface ConnectionCheckOptions {
  apiEndpoint: string
  solanaRpcUrl: string
}

const SLOW_THRESHOLD_MS = 3000 // 3 seconds is considered slow
const TIMEOUT_MS = 10000 // 10 second timeout

async function checkEndpoint(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; latency: number }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const start = performance.now()
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const end = performance.now()
    clearTimeout(timeoutId)

    return { ok: response.ok, latency: end - start }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, latency: TIMEOUT_MS }
    }
    return { ok: false, latency: -1 }
  }
}

export const useConnectionCheck = ({
  apiEndpoint,
  solanaRpcUrl,
}: ConnectionCheckOptions): ConnectionCheckResult => {
  const [quality, setQuality] = useState<ConnectionQuality>('unknown')
  const [latency, setLatency] = useState<number | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = useCallback(async (): Promise<ConnectionQuality> => {
    setIsChecking(true)

    try {
      const [apiResult, solanaResult] = await Promise.all([
        checkEndpoint(`${apiEndpoint}/health`),
        checkEndpoint(solanaRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth',
          }),
        }),
      ])

      // worst latency of the two
      const maxLatency = Math.max(apiResult.latency, solanaResult.latency)
      setLatency(maxLatency)

      if (
        (!apiResult.ok && apiResult.latency === -1) ||
        (!solanaResult.ok && solanaResult.latency === -1)
      ) {
        setQuality('offline')
        return 'offline'
      }

      if (maxLatency >= SLOW_THRESHOLD_MS) {
        setQuality('slow')
        return 'slow'
      }

      setQuality('good')
      return 'good'
    } catch {
      setQuality('offline')
      setLatency(null)
      return 'offline'
    } finally {
      setIsChecking(false)
    }
  }, [apiEndpoint, solanaRpcUrl])

  return { quality, latency, isChecking, checkConnection }
}
