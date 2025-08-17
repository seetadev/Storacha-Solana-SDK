"use client";

import React, { useState, useEffect } from "react";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";

interface SolanaWallet {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  on(event: string, callback: () => void): void;
  removeListener(event: string, callback: () => void): void;
}

declare global {
  interface Window {
    solana?: SolanaWallet;
    phantom?: {
      solana?: SolanaWallet;
    };
  }
}

interface WalletConnectionProps {
  className?: string;
  onWalletConnected?: (publicKey: string, balance?: number) => void;
  onWalletDisconnected?: () => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onWalletConnected,
  onWalletDisconnected,
}) => {
  const [wallet, setWallet] = useState<SolanaWallet | null>(null);
  const [connected, setConnected] = useState(false);
  const [connection] = useState(
    new Connection(clusterApiUrl("devnet"), "confirmed")
  );

  useEffect(() => {
    const getProvider = () => {
      if (window.phantom?.solana?.isPhantom) {
        return window.phantom.solana;
      }
      if (window.solana?.isPhantom) {
        return window.solana;
      }
      return null;
    };

    const provider = getProvider();
    if (provider) {
      setWallet(provider);

      if (provider.publicKey) {
        setConnected(true);
        const pubKey = provider.publicKey.toString();
        fetchBalance(provider.publicKey).then((bal) => {
          onWalletConnected?.(pubKey, bal);
        });
      }

      const handleConnect = () => {
        if (provider.publicKey) {
          setConnected(true);
          const pubKey = provider.publicKey.toString();
          fetchBalance(provider.publicKey).then((bal) => {
            onWalletConnected?.(pubKey, bal);
          });
        }
      };

      const handleDisconnect = () => {
        setConnected(false);
        onWalletDisconnected?.();
      };

      provider.on("connect", handleConnect);
      provider.on("disconnect", handleDisconnect);

      return () => {
        provider.removeListener("connect", handleConnect);
        provider.removeListener("disconnect", handleDisconnect);
      };
    }
  }, []);

  const fetchBalance = async (
    pubKey: PublicKey
  ): Promise<number | undefined> => {
    try {
      const lamports = await connection.getBalance(pubKey);
      const solBalance = lamports / 1e9;
      return solBalance;
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return undefined;
    }
  };

  const connectWallet = async () => {
    if (!wallet) {
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      const response = await wallet.connect();
      if (response.publicKey) {
        setConnected(true);
        const pubKey = response.publicKey.toString();
        const balance = await fetchBalance(response.publicKey);
        onWalletConnected?.(pubKey, balance);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const disconnectWallet = async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
      } catch (error) {
        console.error("Failed to disconnect wallet:", error);
      }
    }
  };

  if (!wallet) {
    return (
      <button onClick={connectWallet} className="button-secondary">
        Install Phantom
      </button>
    );
  }

  return (
    <div>
      {connected ? (
        <button onClick={disconnectWallet} className="button-secondary">
          Disconnect
        </button>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  );
};

export default WalletConnection;
