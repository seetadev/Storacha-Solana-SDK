"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import {
  Upload,
  FileText,
  Image,
  Video,
  Music,
  File,
  X,
  DollarSign,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  History
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import Card from '@/components/Card';
import Button from '@/components/Button';
import FileUpload from '@/components/FileUpload';
import StorageDurationSelector from '@/components/StorageDurationSelector';
import ProgressBar from '@/components/ProgressBar';
import WalletConnection from '@/components/WalletConnection';
import { uploadService, UploadResult } from '@/services/api';

const UploadPage: React.FC = () => {
  const router = useRouter();

  const { walletConnected, solanaPublicKey, solanaBalance } = useWallet();
  const { publicKey, signTransaction } = useSolanaWallet();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [storageDuration, setStorageDuration] = useState(30);
  const [totalCost, setTotalCost] = useState(0);
  const [uploadStep, setUploadStep] = useState<'select' | 'configure' | 'pay' | 'uploading' | 'complete'>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first');
      router.push('/');
    }
  }, [walletConnected, router]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const calculateRealCost = () => {
    if (selectedFiles.length === 0) return 0;
    if(storageDuration < 1){
      toast.error("Duration must be at least 1 day or more.")
    }
    const totalFile = selectedFiles[0]; // For now, handle single file
    const cost = uploadService.calculateEstimatedCost(totalFile, storageDuration);
    return cost.sol;
  };

  useEffect(() => {
    if(storageDuration < 1 || !storageDuration){
      toast.error("Duration must be at least 1 day or more.")
    }
    setTotalCost(calculateRealCost());
  }, [selectedFiles, storageDuration]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setUploadStep('configure');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) {
      setUploadStep('select');
    }
  };

  const handleRealUpload = async () => {
    const depositAmount = totalCost
    if (solanaBalance && (depositAmount > solanaBalance)) {
      toast.error("You do not have sufficient SOL in your wallet")
      return
    }
    if(storageDuration < 1 || !storageDuration){
      toast.error("Duration must be at least 1 day or more.")
      return
    }
    if (!publicKey || !signTransaction || selectedFiles.length === 0) {
      toast.error('Wallet not properly connected or no files selected');
      return;
    }

    if(storageDuration < 1){
      toast.error("Duration must be at least 1 day or more.")
    }

    setUploadStep('uploading');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const file = selectedFiles[0];

      // Stage 1: Upload to API (0-30%)
      setUploadProgress(10);
      toast.loading('Uploading file to IPFS...', { id: 'upload-progress' });

      console.log('🚀 Starting upload process for file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        duration: storageDuration,
        publicKey: publicKey.toString()
      });

      const result = await uploadService.uploadFileWithDeposit(
        file,
        storageDuration,
        publicKey,
        async (tx) => {
          // Stage 2: Sign transaction (30-50%)
          setUploadProgress(40);
          toast.loading('Please sign the transaction in your wallet...', { id: 'upload-progress' });

          console.log('📝 Transaction ready for signing:', tx);

          try {
            const signed = await signTransaction(tx);
            console.log('✅ Transaction signed successfully');

            // Stage 3: Transaction sent (50-80%)
            setUploadProgress(60);
            toast.loading('Transaction sent to network...', { id: 'upload-progress' });

            return signed;
          } catch (signError) {
            console.error('❌ Transaction signing failed:', signError);
            throw new Error(`Transaction signing failed: ${signError instanceof Error ? signError.message : 'Unknown error'}`);
          }
        }
      );

      // Stage 4: Confirming (80-100%)
      setUploadProgress(90);
      toast.loading('Confirming transaction...', { id: 'upload-progress' });

      if (result.success) {
        setUploadProgress(100);
        setTransactionHash(result.signature || null);
        setUploadResult(result);
        setUploadStep('complete');

        toast.success('Upload and deposit successful!', { id: 'upload-progress' });

        // Log success details
        console.log('🎉 Upload completed successfully:', {
          signature: result.signature,
          cid: result.cid,
          fileUrl: result.fileUrl,
          fileInfo: result.fileInfo
        });
      } else {
        console.error('❌ Upload failed:', result.error);
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error in component:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage, { id: 'upload-progress' });
      setUploadStep('configure');
    } finally {
      setIsUploading(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-gradient-purple flex items-center justify-center p-4">
        <Card className="max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Wallet Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please connect your Solana wallet to upload files and make deposits.
            </p>
            <div className="space-y-4">
              <WalletConnection className="w-full" />
              <Button variant="secondary" onClick={() => router.push('/')}>
                Go Back Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-purple">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header with Navigation */}
          <div className="mb-8 text-center text-white">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </button>

              <div className="flex gap-10 items-center">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex cursor-pointer h-max items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <History className="w-4 h-4" />
                  Dashboard
                </Button>
                <WalletConnection showDisconnect={true} />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-4">Upload Files to Storacha</h1>
            <p className="text-white/80 text-lg">
              Securely store your files on the decentralized network with real Solana deposits
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-center items-center space-x-4">
              {['select', 'configure', 'uploading', 'complete'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${uploadStep === step
                      ? 'bg-yellow-400 text-gray-900'
                      : index < ['select', 'configure', 'uploading', 'complete'].indexOf(uploadStep)
                        ? 'bg-green-400 text-gray-900'
                        : 'bg-white/20 text-white'
                    }`}>
                    {index < ['select', 'configure', 'uploading', 'complete'].indexOf(uploadStep) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${index < ['select', 'configure', 'uploading', 'complete'].indexOf(uploadStep)
                        ? 'bg-green-400'
                        : 'bg-white/20'
                      }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: File Selection */}
            {uploadStep === 'select' && (
              <motion.div
                key="select"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-8">
                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1} // For now, limit to 1 file
                  />
                </Card>
              </motion.div>
            )}

            {/* Step 2: Configuration */}
            {uploadStep === 'configure' && (
              <motion.div
                key="configure"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Selected Files */}
                <Card>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Selected File
                  </h3>
                  <div className="space-y-3">
                    {selectedFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file.type);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <FileIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>

                {/* Storage Duration */}
                <Card>
                  <StorageDurationSelector
                    selectedDuration={storageDuration}
                    onDurationChange={setStorageDuration}
                    fileSize={calculateTotalSize() / (1024 * 1024)}
                  />
                </Card>

                {/* Real Cost Summary */}
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Deposit Required
                      </h3>
                      <p className="text-gray-600">
                        {formatFileSize(calculateTotalSize())} × {storageDuration} days
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Real-time calculation based on network rates
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {totalCost.toFixed(6)} SOL
                      </div>
                      <div className="text-sm text-gray-600">
                        {/*where is 25 coming from? is this the correct SOL/USD rate? we need to get this from a realtime API or somn'*/}
                        ≈ ${(totalCost * 25).toFixed(4)} USD
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        + network fees
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-4 items-center">
                  <Button
                    variant="secondary"
                    onClick={() => setUploadStep('select')}
                    className="flex w-full text-center justify-center cursor-pointer"
                  >
                    Back to Selection
                  </Button>
                  <Button
                    onClick={handleRealUpload}
                    disabled={isUploading || storageDuration < 1}
                    className="flex w-full text-center disabled:cursor-not-allowed justify-center cursor-pointer bg-gradient-to-r items-center from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Upload & Deposit
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Uploading with Real Progress */}
            {uploadStep === 'uploading' && (
              <motion.div
                key="uploading"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Card className="text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                      <Upload className="w-8 h-8 text-white animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      Processing Upload & Deposit...
                    </h3>
                    <p className="text-gray-600">
                      Uploading to IPFS and confirming Solana transaction
                    </p>
                  </div>

                  <ProgressBar progress={uploadProgress} />

                  <div className="mt-4 text-sm text-gray-600">
                    Progress: {Math.round(uploadProgress)}%
                    {isUploading && <span className="ml-2 animate-pulse">Processing...</span>}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Complete with Transaction Details */}
            {uploadStep === 'complete' && (
              <motion.div
                key="complete"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Card className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-white" />
                  </motion.div>

                  <h3 className="text-3xl font-semibold text-gray-900 mb-4">
                    Upload Successful! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your file has been uploaded to IPFS and deposit confirmed on Solana
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Files Uploaded:</span>
                        <div className="text-purple-600 font-semibold">{selectedFiles.length}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Size:</span>
                        <div className="text-purple-600 font-semibold">{formatFileSize(calculateTotalSize())}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Storage Duration:</span>
                        <div className="text-purple-600 font-semibold">{storageDuration} days</div>
                      </div>
                    </div>
                  </div>

                  {transactionHash && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-green-800">Transaction Hash:</p>
                        <button
                          onClick={() => window.open(`https://explorer.solana.com/tx/${transactionHash}?cluster=testnet`, '_blank')}
                          className="text-green-600 hover:text-green-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono block break-all">
                        {transactionHash}
                      </code>
                    </div>
                  )}

                  {uploadResult?.cid && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-800">IPFS CID:</p>
                        <button
                          onClick={() => window.open(`https://${uploadResult.cid}.ipfs.w3s.link`, '_blank')}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono block break-all">
                        {uploadResult.cid}
                      </code>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedFiles([]);
                        setUploadStep('select');
                        setUploadProgress(0);
                        setTransactionHash(null);
                        setUploadResult(null);
                      }}
                      className="flex-1"
                    >
                      Upload More Files
                    </Button>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="flex-1"
                    >
                      View Dashboard
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wallet Info */}
          {walletConnected && (
            <Card className="mt-8 bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Connected Wallet</p>
                  <p className="text-xs text-purple-600 font-mono">
                    {solanaPublicKey}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-800">Balance</p>
                  <p className="text-lg font-bold text-purple-600">
                    {solanaBalance?.toFixed(4)} SOL
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
