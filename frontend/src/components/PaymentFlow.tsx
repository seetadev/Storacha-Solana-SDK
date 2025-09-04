"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Zap, Shield, CheckCircle } from 'lucide-react';
import Card from './Card';
import Button from './Button';

interface PaymentFlowProps {
  cost: number;
  onPaymentComplete: () => void;
}

const PaymentFlow: React.FC<PaymentFlowProps> = ({ cost, onPaymentComplete }) => {
  const [paymentStep, setPaymentStep] = useState<'confirm' | 'processing' | 'complete'>('confirm');
  const [processingProgress, setProcessingProgress] = useState(0);

  const processPayment = () => {
    setPaymentStep('processing');
    
    // Simulate payment processing
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPaymentStep('complete');
          setTimeout(onPaymentComplete, 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <Card className="max-w-md mx-auto">
      {paymentStep === 'confirm' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Confirm Payment
          </h3>
          <p className="text-gray-600 mb-6">
            You&apos;re about to pay for secure blockchain storage
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Storage Cost:</span>
              <span className="font-semibold">{cost.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Network Fee:</span>
              <span className="font-semibold">~0.0001 SOL</span>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="font-bold text-lg text-purple-600">
                {(cost + 0.0001).toFixed(4)} SOL
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Secure blockchain transaction</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Fast Solana network</span>
            </div>
          </div>

          <Button
            onClick={processPayment}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Confirm & Pay {(cost + 0.0001).toFixed(4)} SOL
          </Button>
        </motion.div>
      )}

      {paymentStep === 'processing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Processing Payment...
          </h3>
          <p className="text-gray-600 mb-6">
            Your transaction is being confirmed on the Solana network
          </p>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${processingProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <p className="text-sm text-gray-600">
            {processingProgress}% complete
          </p>
        </motion.div>
      )}

      {paymentStep === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Payment Successful! ✅
          </h3>
          <p className="text-gray-600">
            Your payment has been confirmed. Starting upload...
          </p>
        </motion.div>
      )}
    </Card>
  );
};

export default PaymentFlow;
