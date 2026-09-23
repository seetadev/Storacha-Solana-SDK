const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function injectedProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { ethereum?: EthereumProvider }).ethereum
}

/**
 * Wait until a PPT transfer is in a block.
 * Uses the connected wallet (MetaMask) so the browser does not call the
 * public Arbitrum RPC directly. That call is what surfaces as "Failed to fetch"
 * when the RPC has no CORS headers, and it was aborting the upload before
 * the file was ever pinned.
 */
export async function waitForTxReceipt(
  hash: string,
  timeoutMs = 90_000,
): Promise<void> {
  const ethereum = injectedProvider()
  if (!ethereum) {
    throw new Error('MetaMask is not available to confirm the PPT payment')
  }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const receipt = await ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [hash],
      })
      if (receipt) return
    } catch {
      // Wallet provider can briefly reject while the tx is propagating.
    }
    await sleep(1500)
  }

  throw new Error('Timed out waiting for the PPT transaction to confirm')
}
