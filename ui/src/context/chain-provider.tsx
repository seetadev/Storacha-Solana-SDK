import type { PaymentChain } from '@toju.network/fil'
import React, { useState } from 'react'

interface ChainContextValues {
  selectedChain: PaymentChain
  setSelectedChain: (chain: PaymentChain) => void
}

export const ChainContext = React.createContext<ChainContextValues | null>(null)

export const ChainProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChain, setSelectedChain] = useState<PaymentChain>('sol')

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain }}>
      {children}
    </ChainContext.Provider>
  )
}
