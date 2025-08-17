"use client";

import React from "react";
import Link from "next/link";
import WalletConnection from "@/components/WalletConnection";
import { useWallet } from "@/contexts/WalletContext";
import Card from "@/components/Card";
import SocialFooter from "@/components/SocialFooter";

const Home: React.FC = () => {
  const { handleWalletConnected, handleWalletDisconnected, walletConnected } =
    useWallet();

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-16">
          <div className="text-black font-semibold text-4xl sm:text-5xl lg:text-6xl">
            Storacha Solana SDK
          </div>

          <Card className="w-full lg:w-1/2">
            <div className="text-lg text-black font-bold">
              Go to User Dashboard
            </div>
            <div className="text-sm text-gray-500 mb-5">
              {walletConnected
                ? "File management and delegation"
                : "First, connect your Solana wallet"}
            </div>

            {walletConnected ? (
              <div className="w-full bg-purple-600 text-white text-center py-2 rounded-lg">
                <Link className="text-white" href="/user">
                  Go to User Dashboard
                </Link>
              </div>
            ) : (
              <WalletConnection
                onWalletConnected={handleWalletConnected}
                onWalletDisconnected={handleWalletDisconnected}
                className="w-full bg-purple-600 text-white text-center py-2 rounded-lg"
              />
            )}
          </Card>
        </div>

        <SocialFooter />
      </div>
    </div>
  );
};

export default Home;
