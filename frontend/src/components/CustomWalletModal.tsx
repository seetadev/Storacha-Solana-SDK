"use client";

import { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Wallet, X } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";

interface CustomWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomWalletModal: React.FC<CustomWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallets, select, connecting, connected } = useWallet();
  const [showAll, setShowAll] = useState(false);

  const handleWalletSelect = async (walletName: string) => {
    try {
      select(walletName as WalletName);
      toast.loading("Connecting to wallet...", { id: "wallet-connect" });
    } catch (error: any) {
      console.error("Wallet selection error:", error);

      // Check if it's the ethereum property redefinition error
      if (
        error?.message?.includes("redefine property") ||
        error?.message?.includes("ethereum")
      ) {
        toast.error(
          "Wallet conflict detected. Please disable Brave Wallet in brave://settings/web3",
          { id: "wallet-connect", duration: 6000 },
        );
      } else {
        toast.error("Failed to connect wallet", { id: "wallet-connect" });
      }
    }
  };

  React.useEffect(() => {
    if (connected) {
      onClose();
      toast.success("Wallet connected successfully!", { id: "wallet-connect" });
    }
  }, [connected, onClose]);

  const installedWallets = wallets.filter(
    (wallet) => wallet.readyState === "Installed",
  );
  const loadableWallets = wallets.filter(
    (wallet) => wallet.readyState === "Loadable",
  );
  const notDetectedWallets = wallets.filter(
    (wallet) => wallet.readyState === "NotDetected",
  );

  const displayWallets = showAll
    ? [...installedWallets, ...loadableWallets, ...notDetectedWallets]
    : [...installedWallets, ...loadableWallets.slice(0, 3)];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Custom Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-purple-900/80 backdrop-blur-xl" />

          {/* Floating Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-8 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Wallet
              </h2>
              <p className="text-white/70">
                Choose your preferred Solana wallet to continue
              </p>
            </div>

            {/* Wallet List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {displayWallets.map((wallet) => (
                <motion.button
                  key={wallet.adapter.name}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                  disabled={connecting}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 rounded-2xl transition-all duration-200 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="relative">
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-12 h-12 rounded-xl"
                    />
                    {wallet.readyState === "Installed" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white/20" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold text-lg">
                      {wallet.adapter.name}
                    </div>
                    <div className="text-white/60 text-sm">
                      {wallet.readyState === "Installed"
                        ? "Ready to connect"
                        : wallet.readyState === "Loadable"
                          ? "Click to install"
                          : "Not detected"}
                    </div>
                  </div>

                  {wallet.readyState === "Installed" && (
                    <div className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30">
                      DETECTED
                    </div>
                  )}

                  {connecting && (
                    <div className="absolute inset-0 bg-white/5 rounded-2xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Show More/Less Button */}
            {(loadableWallets.length > 3 || notDetectedWallets.length > 0) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-4 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 rounded-xl text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>{showAll ? "Show Less" : "More Options"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}
                />
              </motion.button>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-white/50 text-xs">
                New to Solana?{" "}
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:text-purple-200 transition-colors"
                >
                  Get a wallet
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomWalletModal;
