"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import {
  FileText,
  Upload,
  History,
  Download,
  ExternalLink,
  Search,
  Filter,
  Receipt,
  ArrowLeft,
  Eye,
  Copy,
  Trash2,
  Calendar,
  DollarSign,
  HardDrive,
  Clock,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import Card from "@/components/Card";
import Button from "@/components/Button";
import WalletConnection from "@/components/WalletConnection";
import ReceiptModal from "@/components/ReceiptModel";
import { useDeposit, Environment } from "storacha-sol";
import { DashboardStats, UploadedFile } from "@/types";

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { walletConnected, solanaPublicKey, solanaBalance } = useWallet();
  const { publicKey } = useSolanaWallet();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalStorage: 0,
    totalSpent: 0,
    activeFiles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "expired">(
    "all"
  );
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "files" | "transactions" | "stats"
  >("files");
  const client = useDeposit("testnet" as Environment);
  // Mock data for demonstration - replace with real API calls
  useEffect(() => {
    if (!walletConnected || !solanaPublicKey) {
      router.push("/");
      return;
    }

    loadDashboardData();
  }, [walletConnected, solanaPublicKey, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (solanaPublicKey) {
        const data = await client.getUserUploadHistory(solanaPublicKey);
        console.log(data);
      }
      // Mock data - replace with real API calls
      const mockFiles: UploadedFile[] = [
        {
          id: "1",
          cid: "bafkreiha67s2x5hvraj4fve34agnehp5x276uzyc4kh6lb6r56gnk2536u",
          filename: "presentation.pdf",
          size: 2400000,
          type: "application/pdf",
          url: "https://w3s.link/ipfs/bafkreiha67s2x5hvraj4fve34agnehp5x276uzyc4kh6lb6r56gnk2536u",
          uploadedAt: "2025-08-21T18:08:47.724Z",
          signature: "5KJhG8xYzW2REEEjGjzRy8Ccedq8GjQMPkKAoxdbi4nf88n",
          duration: 30,
          cost: 0.0045,
          status: "active",
        },
        {
          id: "2",
          cid: "bafkreiab23d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
          filename: "contract.docx",
          size: 856000,
          type: "application/docx",
          url: "https://w3s.link/ipfs/bafkreiab23d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
          uploadedAt: "2025-08-20T14:30:22.154Z",
          signature: "3QrZkcW2REEEjGjzRy8Ccedq8GjQMPkKAoxdbi4nf88n",
          duration: 90,
          cost: 0.0087,
          status: "active",
        },
        {
          id: "3",
          cid: "bafkreicd45e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8",
          filename: "image.png",
          size: 1200000,
          type: "image/png",
          url: "https://w3s.link/ipfs/bafkreicd45e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8",
          uploadedAt: "2025-08-19T09:15:33.987Z",
          signature: "2PqYjdW1QEEEiGiYTx7Bbdcp7FiPLpJBnxaci3me77m",
          duration: 7,
          cost: 0.0012,
          status: "expired",
        },
      ];

      setFiles(mockFiles);

      // Calculate stats
      const totalStorage = mockFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSpent = mockFiles.reduce((sum, file) => sum + file.cost, 0);
      const activeFiles = mockFiles.filter(
        (file) => file.status === "active"
      ).length;

      setStats({
        totalFiles: mockFiles.length,
        totalStorage,
        totalSpent,
        activeFiles,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📄";
    if (type.includes("document") || type.includes("docx")) return "📝";
    return "📁";
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || file.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-gradient-purple flex items-center justify-center p-4">
        <Card className="max-w-md">
          <div className="text-center">
            <FileText className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Connect Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Please connect your Solana wallet to view your uploaded files and
              transaction history.
            </p>
            <WalletConnection className="w-full mb-4" />
            <Button variant="secondary" onClick={() => router.push("/")}>
              Go Back Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-purple">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </button>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push("/user")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <WalletConnection showDisconnect={true} />
              </div>
            </div>

            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4">Storage Dashboard</h1>
              <p className="text-white/80 text-lg">
                Manage your decentralized file storage and view transaction
                history
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalFiles}
              </div>
              <div className="text-gray-600 text-sm">Total Files</div>
            </Card>

            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatFileSize(stats.totalStorage)}
              </div>
              <div className="text-gray-600 text-sm">Total Storage</div>
            </Card>

            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalSpent.toFixed(4)} SOL
              </div>
              <div className="text-gray-600 text-sm">Total Spent</div>
            </Card>

            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stats.activeFiles}
              </div>
              <div className="text-gray-600 text-sm">Active Files</div>
            </Card>
          </div>

          {/* Tab Navigation */}
          <Card className="mb-6">
            <div className="flex border-b border-gray-200">
              {[
                { key: "files", label: "Files", icon: FileText },
                { key: "transactions", label: "Transactions", icon: History },
                { key: "stats", label: "Analytics", icon: Receipt },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Files Tab */}
          {activeTab === "files" && (
            <Card>
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Files</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Files List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {searchTerm || filterType !== "all"
                      ? "No files match your criteria"
                      : "No files uploaded yet"}
                  </p>
                  {!searchTerm && filterType === "all" && (
                    <Button onClick={() => router.push("/upload")}>
                      Upload Your First File
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">
                            {getFileIcon(file.type || "")}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {file.filename}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                Size: {formatFileSize(file.size)} • Type:{" "}
                                {file.type}
                              </p>
                              <p>
                                Uploaded:{" "}
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                              <p>
                                Duration: {file.duration} days • Cost:{" "}
                                {file.cost.toFixed(4)} SOL
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              file.status === "active"
                                ? "bg-green-100 text-green-800"
                                : file.status === "expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {file.status.charAt(0).toUpperCase() +
                              file.status.slice(1)}
                          </span>

                          <div className="flex gap-1">
                            <button
                              onClick={() => window.open(file.url, "_blank")}
                              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                              title="View File"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => copyToClipboard(file.cid, "CID")}
                              className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                              title="Copy CID"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() =>
                                window.open(
                                  `https://explorer.solana.com/tx/${file.signature}?cluster=testnet`,
                                  "_blank"
                                )
                              }
                              className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                              title="View Transaction"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedFile(file);
                                setShowReceipt(true);
                              }}
                              className="p-2 text-gray-500 hover:text-orange-600 transition-colors"
                              title="View Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <Card>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Transaction History
              </h3>
              <div className="space-y-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {file.filename}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(file.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-purple-600">
                          -{file.cost.toFixed(4)} SOL
                        </div>
                        <div className="text-sm text-gray-600">
                          Storage Deposit
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>TX: {file.signature.substring(0, 16)}...</span>
                      <button
                        onClick={() =>
                          copyToClipboard(file.signature, "Transaction Hash")
                        }
                        className="hover:text-purple-600 transition-colors"
                      >
                        <Copy className="w-3 h-3 inline mr-1" />
                        Copy
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `https://explorer.solana.com/tx/${file.signature}?cluster=testnet`,
                            "_blank"
                          )
                        }
                        className="hover:text-purple-600 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 inline mr-1" />
                        Explorer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === "stats" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Storage Usage
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Files</span>
                    <span className="font-semibold">{stats.totalFiles}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Storage</span>
                    <span className="font-semibold">
                      {formatFileSize(stats.totalStorage)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Files</span>
                    <span className="font-semibold text-green-600">
                      {stats.activeFiles}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Expired Files</span>
                    <span className="font-semibold text-red-600">
                      {stats.totalFiles - stats.activeFiles}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Spending Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Spent</span>
                    <span className="font-semibold">
                      {stats.totalSpent.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">USD Value</span>
                    <span className="font-semibold">
                      ${(stats.totalSpent * 25).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average per File</span>
                    <span className="font-semibold">
                      {stats.totalFiles > 0
                        ? (stats.totalSpent / stats.totalFiles).toFixed(4)
                        : "0.0000"}{" "}
                      SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Balance</span>
                    <span className="font-semibold text-purple-600">
                      {solanaBalance?.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && selectedFile && (
          <ReceiptModal
            file={{ ...selectedFile, type: selectedFile.type || "" }}
            onClose={() => {
              setShowReceipt(false);
              setSelectedFile(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
