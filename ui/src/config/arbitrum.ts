export const USDC_DECIMALS = 6

/** Generic network selection: mainnet, sepolia, or both. */
type ArbitrumNetwork = 'mainnet' | 'sepolia' | 'both'

const configuredArbitrumNetwork = import.meta.env.VITE_ARBITRUM_NETWORK as
  | string
  | undefined

const ARBITRUM_NETWORK: ArbitrumNetwork =
  configuredArbitrumNetwork === 'mainnet' ||
  configuredArbitrumNetwork === 'sepolia'
    ? configuredArbitrumNetwork
    : 'both'

export function getArbitrumExplorerTxUrl(
  hash: string,
  network: ArbitrumNetwork = ARBITRUM_NETWORK,
): string {
  const baseUrl =
    network === 'mainnet'
      ? 'https://arbiscan.io'
      : 'https://sepolia.arbiscan.io'
  return `${baseUrl}/tx/${hash}`
}

export function getEthereumExplorerTxUrl(
  hash: string,
  network: ArbitrumNetwork = ARBITRUM_NETWORK,
): string {
  const baseUrl =
    network === 'mainnet'
      ? 'https://etherscan.io'
      : 'https://sepolia.etherscan.io'
  return `${baseUrl}/tx/${hash}`
}
