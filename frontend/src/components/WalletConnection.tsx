"use client";

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, Power, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomWalletModal from './CustomWalletModal';

interface WalletConnectionProps {
  className?: string;
  showDisconnect?: boolean;
  onWalletConnected?:  () => void
  onWalletDisconnected?: () => void
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  className = "",
  showDisconnect = true,
}) => {
  const { wallet, disconnect, connected, publicKey } = useWallet();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Wallet disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success('Address copied to clipboard!');
    }
  };

  if (connected && wallet && publicKey) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <img
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              className="w-6 h-6"
            />
            <div>
              <div className="text-sm font-medium text-green-800">
                {wallet.adapter.name}
              </div>
              <div className="text-xs text-green-600 font-mono flex items-center gap-1">
                {publicKey.toString().substring(0, 6)}...
                {publicKey.toString().substring(publicKey.toString().length - 6,publicKey.toString().length)}
                <button
                  onClick={copyAddress}
                  className="hover:text-green-800 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        
        {showDisconnect && (
          <div className="flex gap-2">
            <button
              onClick={handleDisconnect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white bg-red-500 hover:bg-red-400 border border-red-200 rounded-lg transition-colors text-sm"
            >
              <Power className="w-4 h-4" />
              Disconnect
            </button>
            <button
              onClick={() => window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=testnet`, '_blank')}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        className={`${className} inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium gap-2 hover:scale-105 hover:shadow-lg`}
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>

      <CustomWalletModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>

  );
};

export default WalletConnection;
