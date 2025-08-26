"use client";

import React, { useState } from "react";
import { userApi } from "../../services/api";
import { useWallet } from "../../contexts/WalletContext";
import {
  ConvertTimeToSeconds,
  DAY_TIME_IN_SECONDS,
} from "../../utils/helperFunctions";
import Card from "@/components/Card";
import Button from "@/components/Button";
import SocialFooter from "@/components/SocialFooter";

const UserDashboard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [proof, setProof] = useState("");
  const [cid, setCid] = useState("");
  const [recipientDid, setRecipientDid] = useState("");
  const [sizeInBytes, setSizeInBytes] = useState("");
  const [durationInUnits, setDurationInUnits] = useState("");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [delegationResult, setDelegationResult] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [loading, setLoading] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [error, setError] = useState<string>("");

  const { walletConnected, solanaPublicKey, solanaBalance } = useWallet();

  const clearError = () => setError("");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    if (!walletConnected || !solanaPublicKey) {
      setError("Please connect your Solana wallet first");
      return;
    }

    setLoading("upload");
    setError("");
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proof", proof);
      formData.append("storachaKey", key);
      formData.append("publicKey", solanaPublicKey);
      formData.append("duration", (30 * DAY_TIME_IN_SECONDS).toString());
      const result = await userApi.uploadFile(
        formData,
        solanaPublicKey,
        solanaBalance || undefined
      );
      setUploadResult(result);
    } catch (err: any) {
      setError(
        "File upload failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading("");
    }
  };

  const handleCreateDelegation = async () => {
    if (!key || !proof || !cid || !recipientDid) {
      setError("Please provide key, proof, CID, and recipient DID");
      return;
    }

    setLoading("delegation");
    setError("");
    setDelegationResult(null);

    try {
      const startTimeSeconds = ConvertTimeToSeconds(startTime);
      const endTimeSeconds = ConvertTimeToSeconds(endTime);
      const baseCapabilities = ["file/upload"];
      const result = await userApi.createDelegation({
        storachaKey: key,
        proof,
        fileCID: cid,
        recipientDID: recipientDid,
        notBefore: startTimeSeconds.toString(),
        baseCapabilities,
        deadline: endTimeSeconds.toString(),
      });
      setDelegationResult(result);
    } catch (err: any) {
      setError(
        "Delegation creation failed: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading("");
    }
  };

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizeInBytes || !durationInUnits) {
      setError("Please provide both size and duration");
      return;
    }

    setLoading("quote");
    setError("");
    setQuoteResult(null);

    try {
      const result = await userApi.getQuote(
        parseInt(sizeInBytes),
        parseInt(durationInUnits)
      );
      setQuoteResult(result);
    } catch (err: any) {
      setError(
        "Quote request failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading("");
    }
  };

  const fillQuoteFromFile = () => {
    if (file) {
      setSizeInBytes(file.size.toString());
      setDurationInUnits("30");
    }
  };

  const fillCidFromUpload = () => {
    if (uploadResult && uploadResult.cid) {
      setCid(uploadResult.cid);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-black font-semibold text-4xl sm:text-5xl lg:text-6xl mb-4">
            User Dashboard
          </h1>
          <p className="text-gray-600 text-lg sm:text-xl">
            Manage your decentralized storage operations
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <div className="flex justify-between items-center">
              <div className="text-red-700">
                <strong>Error:</strong> {error}
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </Card>
        )}

        <Card className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              📁
            </div>
            <div>
              <h2 className="text-black text-2xl font-bold mb-1">
                Upload File to Storacha
              </h2>
              <p className="text-gray-600">
                Store your files securely on the decentralized network
              </p>
            </div>
          </div>

          <form onSubmit={handleFileUpload}>
            <div className="mb-6">
              <label
                htmlFor="file"
                className="block text-black font-semibold mb-3"
              >
                Select File to Upload:
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    file
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-300 hover:border-purple-400"
                  }`}
                >
                  {file ? (
                    <div className="text-black">
                      <div className="text-lg font-semibold">
                        📄 {file.name}
                      </div>
                      <div className="text-gray-600 mt-1">
                        {formatFileSize(file.size)} •{" "}
                        {file.type || "Unknown type"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-semibold text-black">
                        📤 Click to select a file
                      </div>
                      <div className="text-gray-600 mt-1">
                        or drag and drop here
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!walletConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="text-yellow-800">
                  <strong>🔒 Wallet Required:</strong> Connect your Solana
                  wallet above to upload files. Your public key will be included
                  with the upload request.
                </div>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="key"
                className="block text-black font-semibold mb-3"
              >
                Private Key (Base64 Encoded):
              </label>
              <textarea
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your base64 encoded private key (e.g., MgCZT5vrdXIm...)"
                rows={3}
                className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <div className="text-gray-600 text-sm mt-1">
                This should be a base64 encoded Ed25519 private key
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="proof"
                className="block text-black font-semibold mb-3"
              >
                UCAN Proof String:
              </label>
              <textarea
                id="proof"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="Enter your UCAN proof string"
                rows={3}
                className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <div className="text-gray-600 text-sm mt-1">
                The UCAN proof that grants access to your space
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Button
                type="submit"
                disabled={loading === "upload" || !walletConnected}
                className={loading === "upload" ? "opacity-75" : ""}
              >
                {loading === "upload"
                  ? "Uploading..."
                  : !walletConnected
                  ? "Connect Wallet to Upload"
                  : "Upload File"}
              </Button>

              {file && walletConnected && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fillQuoteFromFile}
                >
                  Get Quote for This File
                </Button>
              )}

              {walletConnected && solanaPublicKey && (
                <div className="text-gray-600 text-sm">
                  Uploading as:{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {solanaPublicKey.slice(0, 8)}...{solanaPublicKey.slice(-8)}
                  </code>
                </div>
              )}
            </div>
          </form>

          {uploadResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
              <h3 className="text-green-800 text-xl font-bold mb-4">
                Upload Successful!
              </h3>
              {solanaPublicKey && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="font-semibold text-gray-700">
                      Solana Public Key:
                    </div>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1">
                      {solanaPublicKey}
                    </code>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">
                      Wallet Balance:
                    </div>
                    <div className="text-purple-600 font-semibold mt-1">
                      {solanaBalance !== null
                        ? `${solanaBalance.toFixed(4)} SOL`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              )}
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(uploadResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <Card className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <h2 className="text-black text-2xl font-bold mb-1">
                Storage Cost Calculator
              </h2>
              <p className="text-gray-600">
                Calculate storage costs based on file size and duration
              </p>
            </div>
          </div>

          <form onSubmit={handleGetQuote}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="size"
                  className="block text-black font-semibold mb-3"
                >
                  File Size (bytes):
                </label>
                <input
                  type="number"
                  id="size"
                  value={sizeInBytes}
                  onChange={(e) => setSizeInBytes(e.target.value)}
                  placeholder="e.g., 1048576 (1MB)"
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  {sizeInBytes && `≈ ${formatFileSize(parseInt(sizeInBytes))}`}
                </div>
              </div>
              <div>
                <label
                  htmlFor="duration"
                  className="block text-black font-semibold mb-3"
                >
                  Storage Duration (days):
                </label>
                <input
                  type="number"
                  id="duration"
                  value={durationInUnits}
                  onChange={(e) => setDurationInUnits(e.target.value)}
                  placeholder="e.g., 30"
                  min="1"
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  Minimum duration applies as per system settings
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading === "quote"}
              className={loading === "quote" ? "opacity-75" : ""}
            >
              {loading === "quote" ? "Calculating..." : "Get Quote"}
            </Button>
          </form>

          {quoteResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
              <h3 className="text-green-800 text-xl font-bold mb-4">
                Storage Quote
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="font-semibold text-purple-600">
                    Effective Duration:
                  </div>
                  <div className="text-lg">
                    {quoteResult.effectiveDuration} days
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-purple-600">
                    Rate per Byte/Day:
                  </div>
                  <div className="text-lg">
                    {quoteResult.ratePerBytePerDay} SOL
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-green-600">
                    Total Cost:
                  </div>
                  <div className="text-2xl font-bold">
                    {quoteResult.totalCost} SOL
                  </div>
                </div>
              </div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(quoteResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <Card className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              🔐
            </div>
            <div>
              <h2 className="text-black text-2xl font-bold mb-1">
                Create UCAN Delegation
              </h2>
              <p className="text-gray-600">
                Generate secure access delegations for specific files and
                recipients
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-yellow-800">
              <strong>Security Notice:</strong> Never share your private keys.
              This is for testing purposes only.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateDelegation();
            }}
          >
            <div className="mb-6">
              <label
                htmlFor="recipientDid"
                className="block text-black font-semibold mb-3"
              >
                Recipient DID:
              </label>
              <textarea
                id="recipientDid"
                value={recipientDid}
                onChange={(e) => setRecipientDid(e.target.value)}
                placeholder="Enter DID of the recipient"
                rows={3}
                className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="delegationKey"
                className="block text-black font-semibold mb-3"
              >
                Private Key (Base64 Encoded):
              </label>
              <textarea
                id="delegationKey"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your base64 encoded private key (e.g., MgCZT5vrdXIm...)"
                rows={3}
                className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <div className="text-gray-600 text-sm mt-1">
                This should be a base64 encoded Ed25519 private key
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="delegationProof"
                className="block text-black font-semibold mb-3"
              >
                UCAN Proof String:
              </label>
              <textarea
                id="delegationProof"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="Enter your UCAN proof string"
                rows={3}
                className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <div className="text-gray-600 text-sm mt-1">
                The UCAN proof that grants access to your space
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="cid"
                className="block text-black font-semibold mb-3"
              >
                File CID (Content Identifier):
              </label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    id="cid"
                    value={cid}
                    onChange={(e) => setCid(e.target.value)}
                    placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                    className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                  <div className="text-gray-600 text-sm mt-1">
                    The Content ID of the file for which delegation is being
                    created
                  </div>
                </div>
                {uploadResult && uploadResult.cid && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={fillCidFromUpload}
                    className="whitespace-nowrap"
                  >
                    Use Uploaded File CID
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-black font-semibold mb-3"
                >
                  Start Time:
                </label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  When the delegation should begin
                </div>
              </div>
              <div>
                <label
                  htmlFor="endTime"
                  className="block text-black font-semibold mb-3"
                >
                  End Time:
                </label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  When the delegation should expire
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading === "delegation"}
              onClick={handleCreateDelegation}
              className={loading === "delegation" ? "opacity-75" : ""}
            >
              {loading === "delegation" ? "Creating..." : "Create Delegation"}
            </Button>
          </form>

          {delegationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
              <h3 className="text-green-800 text-xl font-bold mb-4">
                Delegation Created!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-semibold text-gray-700">File CID:</div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1 break-all">
                    {cid}
                  </code>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">
                    Recipient DID:
                  </div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1 break-all">
                    {recipientDid}
                  </code>
                </div>
              </div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(delegationResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <SocialFooter />
      </div>
    </div>
  );
};

export default UserDashboard;
