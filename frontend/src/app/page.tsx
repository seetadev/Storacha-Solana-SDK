"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, Users, FileText, Globe, ArrowRight, CheckCircle } from 'lucide-react';
import WalletConnection from '@/components/WalletConnection';
import { useWallet } from '@/contexts/WalletContext';
import Card from '@/components/Card';

const Home: React.FC = () => {
  const { walletConnected } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Shield, title: "Connect Wallet", description: "Securely connect your Solana wallet" },
    { icon: FileText, title: "Upload Files", description: "Upload files for decentralized storage" },
    { icon: Zap, title: "Pay Per Upload", description: "Pay per file upload with native SOL" },
    { icon: Globe, title: "Access Anywhere", description: "Access your files globally on-chain" },
  ];

  const features = [
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "Files are stored with IPFS and verified on Solana",
      color: "from-blue-500 to-purple-600",
    },
    {
      icon: Zap,
      title: "Fast & Efficient",
      description: "Lightning-fast transactions on Solana blockchain",
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: TrendingUp,
      title: "Flexible Payments",
      description: "Pay-as-you-go pricing enables cost control",
      color: "from-green-400 to-blue-500",
    },
    {
      icon: Users,
      title: "Developer-Ready",
      description: "Built specifically for developers",
      color: "from-purple-500 to-pink-500",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-purple overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce-slow"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-white/5 rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-white/5 rounded-full animate-spin-slow"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
              On-Chain Payment dApp
              </span>
            </h1>
            <p className="text-xl mb-8 text-white/90">
            A proof-of-concept enabling pay-per-upload decentralized storage on Solana. 
              Users pay with native SOL while a reseller account subsidizes the service.
            </p>

            {/* Interactive Step Visualization */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">How it works:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                      currentStep === index 
                        ? 'border-yellow-300 bg-white/20' 
                        : 'border-white/30 bg-white/10'
                    }`}
                    animate={{
                      scale: currentStep === index ? 1.05 : 1,
                    }}
                  >
                    <step.icon className="w-6 h-6 mb-2 mx-auto" />
                    <p className="text-xs font-medium text-center">{step.title}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">13+</div>
                <div className="text-sm text-white/80">Wallet Support</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">{'< 1s'}</div>
                <div className="text-sm text-white/80">Transaction Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">99.9%</div>
                <div className="text-sm text-white/80">Uptime</div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Wallet Connection Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <Card className="text-center relative overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-2xl"></div>
              
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
                >
                  <FileText className="w-8 h-8 text-white" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Storacha Payment dApp
                </h2>
                <p className="text-gray-600 mb-6">
                  {walletConnected
                    ? "🎉 Connected! Ready for file management"
                    : "To begin, connect your Solana wallet"}
                </p>

                {walletConnected ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Link 
                      href="/user"
                      className="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 group"
                    >
                      <span>Start Uploading</span>
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <div className="mt-4 flex items-center justify-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Wallet Connected Successfully
                    </div>
                  </motion.div>
                ) : (
                  <WalletConnection className="w-full" />
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Storacha?
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Built for investors who need secure, decentralized file storage with transparency and control.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group"
              >
                <Card className="text-center h-full relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity rounded-2xl`}></div>
                  <div className="relative ">
                    <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative  py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white/80 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xl font-semibold">Storacha</span>
          </div>
          <p className="text-white/60 text-sm">
            © 2025 PLDG | Storacha
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
