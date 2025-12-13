"use client";

import { useFileDetails, useRenewalCost } from "@/hooks/use-renewal-cost";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Environment, useUpload } from "storacha-sol";

export default function RenewStoragePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = searchParams.get("cid");
  const { publicKey, signTransaction } = useWallet();
  const client = useUpload("testnet" as Environment);

  const [selectedDuration, setSelectedDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);

  const {
    data: renewalCost,
    error: renewalCostError,
    isLoading: isLoadingCost,
  } = useRenewalCost(cid as string, selectedDuration);
  const {
    data: fileDetails,
    error: fileError,
    isLoading,
  } = useFileDetails(publicKey?.toBase58() || "", cid as string);

  const handleDurationChange = (days: number) => {
    setSelectedDuration(days);
    setCustomDuration("");
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    const days = parseInt(value);
    if (days > 0) {
      setSelectedDuration(days);
    }
  };

  const handleRenew = async () => {
    if (!publicKey || !signTransaction || !cid) {
      toast.error("Please connect your wallet");
      return;
    }

    if (selectedDuration < 1) {
      toast.error("Duration must be at least 1 day");
      return;
    }

    setIsRenewing(true);
    setRenewalError(null);

    try {
      const result = await client.renewStorageDuration({
        cid,
        duration: selectedDuration,
        payer: publicKey,
        signTransaction,
      });

      if (result.success) {
        toast.success("Storage renewed successfully!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        throw new Error("Renewal failed");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to renew storage";
      setRenewalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsRenewing(false);
    }
  };

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading file details...</p>
        </div>
      </div>
    );
  }

  if (!cid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load File
          </h2>
          <p className="text-gray-600 mb-6">No CID provided</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-yellow-500 text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view file details and renew storage
          </p>
        </div>
      </div>
    );
  }

  if (fileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load File
          </h2>
          <p className="text-gray-600 mb-6">
            {fileError instanceof Error
              ? fileError.message
              : "Failed to fetch file details"}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(fileDetails?.expiresAt);
  const isExpired = daysRemaining === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-500 hover:text-blue-600 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Extend Storage Duration
          </h1>
          <p className="text-gray-600 mt-2">
            Add more time to keep your file stored on IPFS
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📄 File Details
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Filename:</span>
              <span className="font-medium text-right">
                {fileDetails?.fileName || "Unnamed"}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">
                {formatFileSize(fileDetails?.fileSize)}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-gray-600">CID:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all max-w-md">
                {cid}
              </code>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-gray-600">Current Expiration:</span>
              <span className="font-medium">
                {fileDetails?.expiresAt
                  ? new Date(fileDetails.expiresAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-gray-600">Status:</span>
              <span
                className={`font-semibold ${isExpired ? "text-red-600" : daysRemaining < 7 ? "text-yellow-600" : "text-green-600"}`}
              >
                {isExpired ? "❌ Expired" : `✓ ${daysRemaining} days remaining`}
              </span>
            </div>
          </div>

          {isExpired && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                ⚠️ This file has expired. Renew now to restore access.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⏱️ Additional Duration</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[7, 30, 90, 180].map((days) => (
              <button
                key={days}
                onClick={() => handleDurationChange(days)}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  selectedDuration === days && !customDuration
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium whitespace-nowrap">
              Custom:
            </label>
            <input
              type="number"
              min="1"
              value={customDuration}
              onChange={(e) => handleCustomDurationChange(e.target.value)}
              placeholder="Enter days"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-600 whitespace-nowrap">days</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">💰 Renewal Cost</h2>

          {isLoadingCost ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Calculating cost...</p>
            </div>
          ) : renewalCostError ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to calculate cost</p>
              <p className="text-sm text-gray-500 mt-2">
                {renewalCostError instanceof Error
                  ? renewalCostError.message
                  : "Unknown error"}
              </p>
            </div>
          ) : renewalCost ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{selectedDuration} days</span>
              </div>

              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600">Cost:</span>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    {renewalCost.costInSOL} SOL
                  </div>
                  <div className="text-sm text-gray-500">
                    {renewalCost.costInLamports.toLocaleString()} lamports
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 my-3"></div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">New Expiration:</span>
                <span className="font-semibold text-green-600">
                  {new Date(renewalCost.newExpirationDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Select a duration to see cost</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!publicKey ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Please connect your wallet to renew storage
              </p>
              <p className="text-sm text-gray-500">
                Use the wallet button in the top right corner
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleRenew}
                disabled={isRenewing || !renewalCost}
                className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isRenewing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  `Renew for ${selectedDuration} days`
                )}
              </button>

              {renewalError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{renewalError}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
