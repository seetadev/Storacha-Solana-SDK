const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const DEFAULT_ARB_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc'

const RECEIPT_POLL_INTERVAL_MS = 1500
const RECEIPT_REQUEST_TIMEOUT_MS = 15_000

type EthereumProvider = {
  request: (args: {
    method: string
    params?: Array<unknown>
  }) => Promise<unknown>
}

function injectedProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { ethereum?: EthereumProvider }).ethereum
}

function rpcUrl(): string {
  return import.meta.env.VITE_ARB_SEPOLIA_RPC_URL || DEFAULT_ARB_SEPOLIA_RPC
}

/**
 * Query the receipt on Arbitrum Sepolia directly. Unlike the wallet
 * provider, this always targets the right chain — `window.ethereum`
 * answers for whatever network the wallet currently has selected, so a
 * chain switch (or a second injected wallet owning `window.ethereum`)
 * made this poll miss the receipt forever.
 */
async function getReceiptViaRpc(hash: string): Promise<unknown> {
  const res = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [hash],
      id: 1,
    }),
    signal: AbortSignal.timeout(RECEIPT_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Arbitrum Sepolia RPC failed: ${res.status}`)
  const data = (await res.json()) as { result: unknown }
  return data.result
}

/** Fallback for custom RPC URLs without browser CORS headers. */
async function getReceiptViaWallet(hash: string): Promise<unknown> {
  const ethereum = injectedProvider()
  if (!ethereum) return null
  try {
    return await ethereum.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    })
  } catch {
    // Wallet provider can briefly reject while the tx is propagating.
    return null
  }
}

/**
 * Wait until a PPT transfer is in a block.
 * Polls the Arbitrum Sepolia RPC directly (same endpoint as the wagmi
 * transport, which sends `access-control-allow-origin: *`), falling back
 * to the wallet provider only when the RPC is unreachable from the browser.
 */
export async function waitForTxReceipt(
  hash: string,
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (await getReceiptViaRpc(hash)) return
    } catch {
      // Direct RPC unreachable — try the wallet before the next interval.
      if (await getReceiptViaWallet(hash)) return
    }
    await sleep(RECEIPT_POLL_INTERVAL_MS)
  }

  throw new Error('Timed out waiting for the PPT transaction to confirm')
}
