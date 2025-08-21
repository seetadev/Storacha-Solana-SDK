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
    <div>
      {/* Hero Section */}
      <section className="landing-hero h-screen px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative z-10 w-full  max-w-3xl mx-auto">
          <Card className="w-full h-full">
            <div className="text-xl text-black font-semibold mb-1">
              Storacha Solana SDK
            </div>
            <div className="text-sm text-gray-500 mb-5">
              {walletConnected
                ? "File management and delegation"
                : "To begin, connect your Solana wallet"}
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
      </section>
    </div>
  );
};

export default Home;
