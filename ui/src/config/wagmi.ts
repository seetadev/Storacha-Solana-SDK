import { createConfig, http } from 'wagmi'
import {
  arbitrum,
  arbitrumSepolia,
  filecoin,
  filecoinCalibration,
  mainnet,
  sepolia,
} from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [
    arbitrum,
    arbitrumSepolia,
    mainnet,
    filecoin,
    filecoinCalibration,
    sepolia,
  ],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(
      import.meta.env.VITE_ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    ),
    [arbitrumSepolia.id]: http(
      import.meta.env.VITE_ARB_SEPOLIA_RPC_URL ||
        'https://sepolia-rollup.arbitrum.io/rpc',
    ),
    [mainnet.id]: http(import.meta.env.VITE_ETH_RPC_URL || undefined),
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
  },
})
