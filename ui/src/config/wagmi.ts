import { createConfig, http } from 'wagmi'
import { filecoin, filecoinCalibration } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Get network from environment variable
const getFilecoinNetwork = () => {
  const network = import.meta.env.VITE_FILECOIN_NETWORK
  return network === 'mainnet' ? filecoin : filecoinCalibration
}

const selectedChain = getFilecoinNetwork()

export const config = createConfig({
  chains: [filecoin, filecoinCalibration],
  connectors: [injected()],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
  },
})

// Export the selected chain for use in components
export const filecoinChain = selectedChain
