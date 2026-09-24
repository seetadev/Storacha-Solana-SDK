import { createConfig, http } from 'wagmi'
import {
  arbitrumSepolia,
  filecoin,
  filecoinCalibration,
  sepolia,
} from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [arbitrumSepolia, filecoin, filecoinCalibration, sepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(
      import.meta.env.VITE_ARB_SEPOLIA_RPC_URL ||
        'https://sepolia-rollup.arbitrum.io/rpc',
    ),
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
  },
})
