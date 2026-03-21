import { base, baseSepolia } from 'viem/chains'
import { Environment } from './types'

export const ENDPOINTS: Record<Environment, string> = {
  mainnet: 'https://api.toju.network',
  sepolia: 'https://staging-api.toju.network',
}

export const NETWORKS: Record<Environment, string> = {
  mainnet: 'eip155:8453',
  sepolia: 'eip155:84532',
}

export const CHAINS: Record<Environment, typeof base | typeof baseSepolia> = {
  mainnet: base,
  sepolia: baseSepolia,
}
