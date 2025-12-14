import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import React, { useEffect, useMemo, useReducer, useState } from 'react'
import type { Environment } from 'storacha-sol'

import '@solana/wallet-adapter-react-ui/styles.css'

export interface AuthProviderProps {
  children: React.ReactNode
}

export type AuthContextValues = {
  isAuthenticated: boolean
  logout: () => void
  user: string | null
  balance: number | null
  isLoadingBalance: boolean
  refreshBalance: () => Promise<void>
  network: Environment
}

type Actions =
  | { type: 'LOGOUT' }
  | { type: 'LOGIN'; payload: { publicKey: string } }
  | { type: 'SET_WALLET_BALANCE'; payload: { balance: number | null } }
  | { type: 'LOADING_WALLET_BALANCE'; payload: { isLoading: boolean } }

const createAuthContext = () =>
  React.createContext<AuthContextValues | null>(null)

export const AuthContext = createAuthContext()

const NETWORK = WalletAdapterNetwork.Testnet

const getEnvironment = (network: WalletAdapterNetwork): Environment => {
  switch (network) {
    case WalletAdapterNetwork.Mainnet:
      return 'mainnet' as Environment
    case WalletAdapterNetwork.Testnet:
      return 'testnet' as Environment
    case WalletAdapterNetwork.Devnet:
    default:
      return 'devnet' as Environment
  }
}

export const initialState: AuthContextValues = {
  user: null,
  isAuthenticated: false,
  balance: null,
  isLoadingBalance: false,
  logout: () => {},
  refreshBalance: async () => {},
  network: getEnvironment(NETWORK),
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
        balance: null,
        isLoadingBalance: false,
      }
    case 'SET_WALLET_BALANCE':
      return {
        ...state,
        balance: action.payload.balance,
      }
    case 'LOADING_WALLET_BALANCE':
      return {
        ...state,
        isLoadingBalance: action.payload.isLoading,
      }
    default:
      return state
  }
}

interface WalletProvidersProps {
  children: React.ReactNode
}

export function WalletProviders({ children }: WalletProvidersProps) {
  const endpoint = useMemo(() => clusterApiUrl(NETWORK), [])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
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

  const endpoint = useMemo(() => clusterApiUrl(NETWORK), [])
  const [connection] = useState(() => new Connection(endpoint, 'confirmed'))

  const refreshBalance = async () => {
    if (publicKey && connected) {
      dispatch({ type: 'LOADING_WALLET_BALANCE', payload: { isLoading: true } })
      try {
        const balance = await connection.getBalance(publicKey)
        dispatch({
          type: 'SET_WALLET_BALANCE',
          payload: { balance: balance / LAMPORTS_PER_SOL },
        })
      } catch (error) {
        console.error('Error fetching balance:', error)
        dispatch({ type: 'SET_WALLET_BALANCE', payload: { balance: null } })
      } finally {
        dispatch({
          type: 'LOADING_WALLET_BALANCE',
          payload: { isLoading: false },
        })
      }
    } else {
      dispatch({ type: 'SET_WALLET_BALANCE', payload: { balance: null } })
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      dispatch({
        type: 'LOGIN',
        payload: { publicKey: publicKey.toBase58() },
      })
      refreshBalance()
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
    refreshBalance,
    network: getEnvironment(NETWORK),
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}
