import { ChainContext } from '@/context/chain-provider'
import React from 'react'

export const useChainContext = () => {
  const context = React.useContext(ChainContext)

  if (context === null) {
    throw new Error(
      'Chain context is missing. Wrap the component in <ChainProvider />.',
    )
  }

  return context
}
