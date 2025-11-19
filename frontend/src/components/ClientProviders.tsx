"use client";

import { WalletProvider as CustomWalletProvider } from "@/contexts/WalletContext";
import {
  checkWalletConflict,
  warnAboutWalletConflicts,
} from "@/utils/walletConflictHandler";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  CloverWalletAdapter,
  Coin98WalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import React, { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";

import "@solana/wallet-adapter-react-ui/styles.css";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  const network = WalletAdapterNetwork.Testnet; // Change to Mainnet or Devnet as needed
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [walletConflictDetected, setWalletConflictDetected] = useState(false);

  useEffect(() => {
    const conflictInfo = warnAboutWalletConflicts();
    setWalletConflictDetected(conflictInfo.hasConflict);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new MathWalletAdapter(),
      new Coin98WalletAdapter(),
      new CloverWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={!walletConflictDetected}>
        <WalletModalProvider>
          <CustomWalletProvider>
            {walletConflictDetected && <WalletConflictBanner />}
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#8B5CF6",
                  color: "#fff",
                },
              }}
            />
          </CustomWalletProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletConflictBanner() {
  const [dismissed, setDismissed] = useState(false);
  const conflictInfo = checkWalletConflict();

  if (dismissed || !conflictInfo.hasConflict) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-bold mb-1">
            Wallet Extension Conflict Detected
          </div>
          <div className="text-sm">
            Multiple wallet extensions are active (
            {conflictInfo.detectedWallets.join(", ")}). For Solana development,
            please disable Brave Wallet:
            <ol className="list-decimal ml-5 mt-1">
              <li>
                Open{" "}
                <code className="bg-yellow-600/20 px-1 rounded">
                  brave://settings/web3
                </code>
              </li>
              <li>
                Set both Ethereum and Solana wallets to &ldquo;Extensions(no
                fallback)&rdquo;
              </li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-900 hover:text-yellow-950 font-bold text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
