import { createConfig, http } from 'wagmi'
import { filecoin, filecoinCalibration, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [filecoin, filecoinCalibration, sepolia],
  connectors: [injected()],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
  },
})
