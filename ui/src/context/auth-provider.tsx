import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import React, { useEffect, useMemo, useReducer } from 'react'

import '@solana/wallet-adapter-react-ui/styles.css'

export interface AuthProviderProps {
  children: React.ReactNode
}

export type AuthContextValues = {
  isAuthenticated: boolean
  logout: () => void
  user: string | null
}

type Actions =
  | { type: 'LOGOUT' }
  | { type: 'LOGIN'; payload: { publicKey: string } }

const createAuthContext = () =>
  React.createContext<AuthContextValues | null>(null)

export const AuthContext = createAuthContext()

export const initialState: AuthContextValues = {
  user: null,
  isAuthenticated: false,
  logout: () => {},
}

const authReducer = (
  state: AuthContextValues,
  action: Actions,
): AuthContextValues => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.publicKey,
      }
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      }
    default:
      return state
  }
}

interface WalletProvidersProps {
  children: React.ReactNode
}

export function WalletProviders({ children }: WalletProvidersProps) {
  const network = WalletAdapterNetwork.Testnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { connected, publicKey, disconnect } = useWallet()
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    if (connected && publicKey) {
      dispatch({
        type: 'LOGIN',
        payload: { publicKey: publicKey.toBase58() },
      })
    } else {
      dispatch({ type: 'LOGOUT' })
    }
  }, [connected, publicKey])

  const logout = () => {
    disconnect()
  }

  const values: AuthContextValues = {
    ...state,
    logout,
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}
