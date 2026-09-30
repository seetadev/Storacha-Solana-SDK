import { arbitrum, arbitrumSepolia, mainnet, sepolia } from 'wagmi/chains'

/** USDC on Arbitrum One (mainnet) — native USDC. */
export const ARBITRUM_USDC_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const

/** USDC on Arbitrum Sepolia (testnet). Override with VITE_ARB_SEPOLIA_USDC. */
export const ARBITRUM_SEPOLIA_USDC_ADDRESS = (import.meta.env
  .VITE_ARB_SEPOLIA_USDC ||
  '0x75faf114eafb1BDBe2F0316DF893fd58CE46AA4d') as `0x${string}`

export const ARBITRUM_CHAIN_ID = arbitrum.id
export const ARBITRUM_SEPOLIA_CHAIN_ID = arbitrumSepolia.id
export const ETH_CHAIN_ID = mainnet.id
export const ETH_SEPOLIA_CHAIN_ID = sepolia.id

export const USDC_DECIMALS = 6

/** Generic network selection: mainnet, sepolia, or both. */
export type ArbitrumNetwork = 'mainnet' | 'sepolia' | 'both'

const configuredArbitrumNetwork = import.meta.env.VITE_ARBITRUM_NETWORK as
  | string
  | undefined

export const ARBITRUM_NETWORK: ArbitrumNetwork =
  configuredArbitrumNetwork === 'mainnet' ||
  configuredArbitrumNetwork === 'sepolia'
    ? configuredArbitrumNetwork
    : 'both'

export const isArbitrumMainnetEnabled =
  ARBITRUM_NETWORK === 'mainnet' || ARBITRUM_NETWORK === 'both'
export const isArbitrumSepoliaEnabled =
  ARBITRUM_NETWORK === 'sepolia' || ARBITRUM_NETWORK === 'both'

export const ARBITRUM_CHAINS = [arbitrum, arbitrumSepolia] as const
export const ETH_CHAINS = [mainnet, sepolia] as const

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

export const ARBITRUM_ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
