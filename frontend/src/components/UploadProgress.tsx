// src/components/UploadProgress.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Card from './Card';

interface UploadProgressProps {
  stage: 'uploading' | 'signing' | 'sending' | 'confirming' | 'complete' | 'error';
  progress: number;
  error?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ stage, progress, error }) => {
  const stages = [
    { key: 'uploading', label: 'Uploading to IPFS', icon: Upload },
    { key: 'signing', label: 'Sign Transaction', icon: Loader2 },
    { key: 'sending', label: 'Sending to Network', icon: Loader2 },
    { key: 'confirming', label: 'Confirming Transaction', icon: Loader2 },
    { key: 'complete', label: 'Complete', icon: CheckCircle },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);

  if (error) {
    return (
      <Card className="text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Failed</h3>
        <p className="text-red-600 mb-4">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          {stage === 'complete' ? (
            <CheckCircle className="w-8 h-8 text-white" />
          ) : (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          {stage === 'complete' ? 'Upload Complete!' : 'Processing Upload...'}
        </h3>

        {/* Stage Progress */}
        <div className="space-y-3 mb-6">
          {stages.map((stageInfo, index) => {
            const StageIcon = stageInfo.icon;
            const isActive = index === currentStageIndex;
            const isComplete = index < currentStageIndex;
            const isPending = index > currentStageIndex;

            return (
              <div
                key={stageInfo.key}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isActive ? 'bg-purple-50' : 
                  isComplete ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-purple-500' :
                  isComplete ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : isActive ? (
                    <StageIcon className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-purple-700' :
                  isComplete ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {stageInfo.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="text-sm text-gray-600">
          Progress: {Math.round(progress)}%
        </div>
      </div>
    </Card>
  );
};

export default UploadProgress;
