"use client";

import React from 'react';
import { Clock, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface StorageOption {
  duration: number;
  label: string;
  costPerMB: number;
  popular?: boolean;
  description?: string;
}

interface StorageDurationSelectorProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  fileSize?: number; // in MB
}

const STORAGE_OPTIONS: StorageOption[] = [
  {
    duration: 7,
    label: '7 Days',
    costPerMB: 0.001,
    description: 'Perfect for temporary sharing'
  },
  {
    duration: 30,
    label: '30 Days',
    costPerMB: 0.003,
    popular: true,
    description: 'Most popular for business use'
  },
  {
    duration: 90,
    label: '90 Days',
    costPerMB: 0.008,
    description: 'Great for quarterly reports'
  },
  {
    duration: 180,
    label: '6 Months',
    costPerMB: 0.015,
    description: 'Long-term document storage'
  },
  {
    duration: 365,
    label: '1 Year',
    costPerMB: 0.025,
    description: 'Annual archive storage'
  },
];

const StorageDurationSelector: React.FC<StorageDurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
  fileSize = 0,
}) => {
  const calculateCost = (option: StorageOption): string => {
    const totalCost = option.costPerMB * fileSize;
    return totalCost.toFixed(4);
  };

  const handleChange = (duration: number) => {
    if(duration < 1 || !duration){
      toast.error("Duration must be at least 1 day or more.")
    }
    onDurationChange(duration)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Clock className="w-5 h-5" />
        <label className="font-semibold text-lg">Storage Duration</label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {STORAGE_OPTIONS.map((option) => (
          <div
            key={option.duration}
            onClick={() => onDurationChange(option.duration)}
            className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
              selectedDuration === option.duration
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {option.popular && (
              <div className="absolute -top-2 left-4">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                  <Star className="w-3 h-3" />
                  Popular
                </span>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{option.label}</h3>
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedDuration === option.duration}
                    onChange={handleChange(option.duration)}
                    className="w-4 h-4 text-purple-600"
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-600">{option.description}</p>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {option.costPerMB} SOL per MB
                </p>
                {fileSize > 0 && (
                  <p className="text-sm font-medium text-purple-600">
                    Total: {calculateCost(option)} SOL
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Custom duration input */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Custom Duration (days):
          </label>
          <input
            type="number"
            min="1"
            max="3650"
            value={selectedDuration}
            onChange={(e) => onDurationChange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter days"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter a custom storage duration between 1 and 3650 days
        </p>
      </div>
    </div>
  );
};

export default StorageDurationSelector;
