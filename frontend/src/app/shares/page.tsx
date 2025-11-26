"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import ShareManagement from '@/components/ShareManagement';
import WalletConnection from '@/components/WalletConnection';
import { ArrowLeft, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';

const SharesPage: React.FC = () => {
  const router = useRouter();
  const { walletConnected, solanaPublicKey } = useWallet();

  useEffect(() => {
    if (!walletConnected || !solanaPublicKey) {
      router.push('/');
    }
  }, [walletConnected, solanaPublicKey, router]);

  if (!walletConnected || !solanaPublicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Please connect your wallet to manage shares</p>
          <WalletConnection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center space-x-2">
                <Link2 className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-bold text-white">Share Management</h1>
              </div>
            </div>
            <WalletConnection />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-8"
      >
        <ShareManagement walletAddress={solanaPublicKey} />
      </motion.div>
    </div>
  );
};

export default SharesPage;
