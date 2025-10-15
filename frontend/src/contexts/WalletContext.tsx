"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

interface WalletContextType {
  walletConnected: boolean;
  solanaPublicKey: string | null;
  solanaBalance: number | null;
  isLoading: boolean;
  handleWalletConnected: () => void;
  handleWalletDisconnected: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { connected, publicKey, wallet } = useSolanaWallet();
  const [walletConnected, setWalletConnected] = useState(false);
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Using devnet for development
  const [connection] = useState(() => new Connection(
    'https://api.testnet.solana.com',
    'confirmed'
  ));

  const solanaPublicKey = publicKey?.toString() || null;

  const refreshBalance = async () => {
    if (publicKey && connected) {
      setIsLoading(true);
      try {
        const balance = await connection.getBalance(publicKey);
        setSolanaBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setSolanaBalance(null);
        toast.error('Failed to fetch wallet balance');
      } finally {
        setIsLoading(false);
      }
    } else {
      setSolanaBalance(null);
    }
  };

  const handleWalletConnected = () => {
    setWalletConnected(true);
    if (wallet) {
      toast.success(`Connected to ${wallet.adapter.name}!`);
    }
    refreshBalance();
  };

  const handleWalletDisconnected = () => {
    setWalletConnected(false);
    setSolanaBalance(null);
    toast.success('Wallet disconnected');
  };

  // Update wallet connection state when Solana wallet state changes
  useEffect(() => {
    if (connected && publicKey) {
      setWalletConnected(true);
      refreshBalance();
    } else {
      setWalletConnected(false);
      setSolanaBalance(null);
    }
  }, [connected, publicKey]);

  return (
    <WalletContext.Provider
      value={{
        walletConnected,
        solanaPublicKey,
        solanaBalance,
        isLoading,
        handleWalletConnected,
        handleWalletDisconnected,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
