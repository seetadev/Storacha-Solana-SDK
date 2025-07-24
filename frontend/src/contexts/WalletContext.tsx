import React, { createContext, useContext, useState, ReactNode } from "react";

interface WalletContextType {
  walletConnected: boolean;
  solanaPublicKey: string;
  solanaBalance: number | null;
  setWalletConnected: (connected: boolean) => void;
  setSolanaPublicKey: (publicKey: string) => void;
  setSolanaBalance: (balance: number | null) => void;
  handleWalletConnected: (publicKey: string, balance?: number) => void;
  handleWalletDisconnected: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [solanaPublicKey, setSolanaPublicKey] = useState<string>("");
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);

  const handleWalletConnected = (publicKey: string, balance?: number) => {
    setWalletConnected(true);
    setSolanaPublicKey(publicKey);
    setSolanaBalance(balance || null);
  };

  const handleWalletDisconnected = () => {
    setWalletConnected(false);
    setSolanaPublicKey("");
    setSolanaBalance(null);
  };

  const value = {
    walletConnected,
    solanaPublicKey,
    solanaBalance,
    setWalletConnected,
    setSolanaPublicKey,
    setSolanaBalance,
    handleWalletConnected,
    handleWalletDisconnected,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};
