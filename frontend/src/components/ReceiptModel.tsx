"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  X,
  Download,
  Printer,
  Copy,
  ExternalLink,
  FileText,
  Calendar,
  DollarSign,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "./Card";
import Button from "./Button";

interface ReceiptModalProps {
  file: {
    id: string;
    cid: string;
    filename: string;
    size: number;
    type?: string;
    url: string;
    uploadedAt: string;
    signature: string;
    duration: number;
    cost: number;
    status: string;
  };
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ file, onClose }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const receiptData = {
      receiptId: `RCP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      file: {
        name: file.filename,
        size: formatFileSize(file.size),
        type: file.type,
        cid: file.cid,
        url: file.url,
      },
      transaction: {
        signature: file.signature,
        cost: file.cost,
        duration: file.duration,
        uploadedAt: file.uploadedAt,
        status: file.status,
      },
    };

    const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${file.filename}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Receipt downloaded successfully!");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Storage Receipt
              </h2>
              <p className="text-sm text-gray-600">Transaction Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-6">
          {/* Receipt Header */}
          <div className="text-center border-b border-gray-200 pb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Storacha Storage Receipt
            </h3>
            <p className="text-gray-600">
              Decentralized File Storage on Solana
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Receipt ID: RCP-{file.id}-{Date.now().toString().slice(-6)}
            </div>
          </div>

          {/* File Information */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              File Information
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Filename:</span>
                <span className="font-medium text-gray-900">
                  {file.filename}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="font-medium text-gray-900">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Type:</span>
                <span className="font-medium text-gray-900">{file.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">IPFS CID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                    {file.cid.substring(0, 20)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(file.cid, "CID")}
                    className="text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Transaction Details
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Hash:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                    {file.signature.substring(0, 16)}...
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(file.signature, "Transaction Hash")
                    }
                    className="text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://explorer.solana.com/tx/${file.signature}?cluster=testnet`,
                        "_blank"
                      )
                    }
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium text-gray-900">
                  Solana Testnet
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`font-medium ${
                    file.status === "active"
                      ? "text-green-600"
                      : file.status === "expired"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Storage Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Storage Details
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Upload Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(file.uploadedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage Duration:</span>
                <span className="font-medium text-gray-900">
                  {file.duration} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiry Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(
                    new Date(file.uploadedAt).getTime() +
                      file.duration * 24 * 60 * 60 * 1000
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Payment Information
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Storage Deposit:</span>
                <span className="font-bold text-lg text-green-700">
                  {file.cost.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">
                  USD Value (approx):
                </span>
                <span className="text-gray-600 text-sm">
                  ${(file.cost * 25).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* File Access */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">File Access</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">IPFS Gateway URL</p>
                  <p className="text-blue-700 text-sm">
                    Access your file via IPFS
                  </p>
                </div>
                <button
                  onClick={() => window.open(file.url, "_blank")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open File
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
            <p>
              This receipt serves as proof of your decentralized storage
              transaction.
            </p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 p-6 border-t border-gray-200">
          <Button
            onClick={handleDownloadReceipt}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReceiptModal;
