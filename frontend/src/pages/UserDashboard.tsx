import React, { useState } from "react";
import { userApi } from "../services/api";
import { useWallet } from "../contexts/WalletContext";
import {
  ConvertTimeToSeconds,
  DAY_TIME_IN_SECONDS,
} from "../utils/helperFunctions";

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
    //bafybeigqsh7skobaa456gmpuzd7zp7gxgwsvkrcbzr424pxntdghclhvwe
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
      setDurationInUnits("30"); // Default 30 days
    }
  };

  const fillCidFromUpload = () => {
    if (uploadResult && uploadResult.cid) {
      setCid(uploadResult.cid);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-icon">👤</div>
          <div>
            <h1 className="mb-1">User Dashboard</h1>
            <p className="mb-0 text-secondary">
              Manage your decentralized storage operations
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
          <button
            onClick={clearError}
            style={{
              float: "right",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "0",
              fontSize: "1.2rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* File Upload Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon">📁</div>
          <div>
            <h2 className="mb-1">Upload File to Storacha</h2>
            <p className="mb-0 text-secondary">
              Store your files securely on the decentralized network
            </p>
          </div>
        </div>

        <form onSubmit={handleFileUpload}>
          <div className="form-group">
            <label htmlFor="file">Select File to Upload:</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="file"
                className="file-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              <label
                htmlFor="file"
                className={`file-input-label ${file ? "has-file" : ""}`}
              >
                {file ? (
                  <div>
                    <strong>📄 {file.name}</strong>
                    <br />
                    <span className="text-secondary">
                      {formatFileSize(file.size)} •{" "}
                      {file.type || "Unknown type"}
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong>📤 Click to select a file</strong>
                    <br />
                    <span className="text-secondary">
                      or drag and drop here
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {!walletConnected && (
            <div className="warning mb-3">
              <strong>🔒 Wallet Required:</strong> Connect your Solana wallet
              above to upload files. Your public key will be included with the
              upload request.
            </div>
          )}
          <div className="form-group">
            <label htmlFor="key">Private Key (Base64 Encoded):</label>
            <textarea
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your base64 encoded private key (e.g., MgCZT5vrdXIm...)"
              rows={3}
              required
            />
            <small className="text-secondary">
              This should be a base64 encoded Ed25519 private key
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="proof">UCAN Proof String:</label>
            <textarea
              id="proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Enter your UCAN proof string"
              rows={3}
              required
            />
            <small className="text-secondary">
              The UCAN proof that grants access to your space
            </small>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading === "upload" || !walletConnected}
              className={loading === "upload" ? "loading" : ""}
              title={!walletConnected ? "Connect your Solana wallet first" : ""}
            >
              {loading === "upload"
                ? "Uploading..."
                : !walletConnected
                ? "Connect Wallet to Upload"
                : "Upload File"}
            </button>

            {file && walletConnected && (
              <button
                type="button"
                className="button-secondary"
                onClick={fillQuoteFromFile}
              >
                Get Quote for This File
              </button>
            )}

            {walletConnected && solanaPublicKey && (
              <div className="text-secondary" style={{ fontSize: "0.9rem" }}>
                Uploading as:{" "}
                <code>
                  {solanaPublicKey.slice(0, 8)}...{solanaPublicKey.slice(-8)}
                </code>
              </div>
            )}
          </div>
        </form>

        {uploadResult && (
          <div className="result-container">
            <h3 className="text-success">Upload Successful!</h3>
            {solanaPublicKey && (
              <div className="info mb-2" style={{ fontSize: "0.95rem" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <strong>Solana Public Key:</strong>
                    <br />
                    <code style={{ fontSize: "0.8rem" }}>
                      {solanaPublicKey}
                    </code>
                  </div>
                  <div>
                    <strong>Wallet Balance:</strong>
                    <br />
                    <span className="text-accent">
                      {solanaBalance !== null
                        ? `${solanaBalance.toFixed(4)} SOL`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Get Quote Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="mb-1">Storage Cost Calculator</h2>
            <p className="mb-0 text-secondary">
              Calculate storage costs based on file size and duration
            </p>
          </div>
        </div>

        <form onSubmit={handleGetQuote}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="size">File Size (bytes):</label>
              <input
                type="number"
                id="size"
                value={sizeInBytes}
                onChange={(e) => setSizeInBytes(e.target.value)}
                placeholder="e.g., 1048576 (1MB)"
                required
              />
              <small className="text-secondary">
                {sizeInBytes && `≈ ${formatFileSize(parseInt(sizeInBytes))}`}
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="duration">Storage Duration (days):</label>
              <input
                type="number"
                id="duration"
                value={durationInUnits}
                onChange={(e) => setDurationInUnits(e.target.value)}
                placeholder="e.g., 30"
                min="1"
                required
              />
              <small className="text-secondary">
                Minimum duration applies as per system settings
              </small>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading === "quote"}
            className={`button-success ${loading === "quote" ? "loading" : ""}`}
          >
            {loading === "quote" ? "Calculating..." : "Get Quote"}
          </button>
        </form>

        {quoteResult && (
          <div className="result-container">
            <h3 className="text-success">Storage Quote</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "1rem",
                fontSize: "1.1rem",
              }}
            >
              <div>
                <strong className="text-accent">Effective Duration:</strong>
                <br />
                {quoteResult.effectiveDuration} days
              </div>
              <div>
                <strong className="text-accent">Rate per Byte/Day:</strong>
                <br />
                {quoteResult.ratePerBytePerDay} SOL
              </div>
              <div>
                <strong className="text-success">Total Cost:</strong>
                <br />
                <span style={{ fontSize: "1.3rem" }}>
                  {quoteResult.totalCost} SOL
                </span>
              </div>
            </div>
            <pre>{JSON.stringify(quoteResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Create Delegation Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="mb-1">Create UCAN Delegation</h2>
            <p className="mb-0 text-secondary">
              Generate secure access delegations for specific files and
              recipients
            </p>
          </div>
        </div>

        <div className="warning mb-3">
          <strong>Security Notice:</strong> Never share your private keys. This
          is for testing purposes only.
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateDelegation();
          }}
        >
          <div className="form-group">
            <label htmlFor="proof">Recipient DID:</label>
            <textarea
              id="proof"
              value={recipientDid}
              onChange={(e) => setRecipientDid(e.target.value)}
              placeholder="Enter DID of the recipient"
              rows={3}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="key">Private Key (Base64 Encoded):</label>
            <textarea
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your base64 encoded private key (e.g., MgCZT5vrdXIm...)"
              rows={3}
              required
            />
            <small className="text-secondary">
              This should be a base64 encoded Ed25519 private key
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="proof">UCAN Proof String:</label>
            <textarea
              id="proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Enter your UCAN proof string"
              rows={3}
              required
            />
            <small className="text-secondary">
              The UCAN proof that grants access to your space
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="cid">File CID (Content Identifier):</label>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
            >
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  id="cid"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                  required
                />
                <small className="text-secondary">
                  The Content ID of the file for which delegation is being
                  created
                </small>
              </div>
              {uploadResult && uploadResult.cid && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={fillCidFromUpload}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Use Uploaded File CID
                </button>
              )}
            </div>
          </div>

          <div className="DeadlineContainer">
            <div className="form-group">
              <label htmlFor="startTime">Start Time:</label>
              <input
                type="datetime-local"
                id="startTime"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                }}
                required
              />
              <small className="text-secondary">
                When the delegation should begin
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End Time:</label>
              <input
                type="datetime-local"
                id="endTime"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                }}
                required
              />
              <small className="text-secondary">
                When the delegation should expire
              </small>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading === "delegation"}
            className={loading === "delegation" ? "loading" : ""}
            onClick={() => {
              handleCreateDelegation();
            }}
          >
            {loading === "delegation" ? "Creating..." : "Create Delegation"}
          </button>
        </form>

        {delegationResult && (
          <div className="result-container">
            <h3 className="text-success">Delegation Created!</h3>
            <div className="info mb-2" style={{ fontSize: "0.95rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>File CID:</strong>
                  <br />
                  <code style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
                    {cid}
                  </code>
                </div>
                <div>
                  <strong>Recipient DID:</strong>
                  <br />
                  <code style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
                    {recipientDid}
                  </code>
                </div>
              </div>
            </div>
            <pre>{JSON.stringify(delegationResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
