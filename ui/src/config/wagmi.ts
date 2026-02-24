import { createConfig, http } from 'wagmi'
import { filecoin, filecoinCalibration } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [filecoin, filecoinCalibration],
  connectors: [injected()],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
  },
})
