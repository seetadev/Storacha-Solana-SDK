import type { PaymentChain } from '@/lib/types'
import React, { useState } from 'react'

interface ChainContextValues {
  selectedChain: PaymentChain
  setSelectedChain: (chain: PaymentChain) => void
}

export const ChainContext = React.createContext<ChainContextValues | null>(null)

export const ChainProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChain, setSelectedChain] = useState<PaymentChain>('arb')

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain }}>
      {children}
    </ChainContext.Provider>
  )
}
