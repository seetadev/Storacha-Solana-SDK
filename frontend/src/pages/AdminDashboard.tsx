import React, { useState } from "react";
import { adminApi } from "../services/api";

const AdminDashboard: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newMinDuration, setNewMinDuration] = useState("");
  const [rateResult, setRateResult] = useState<any>(null);
  const [durationResult, setDurationResult] = useState<any>(null);
  const [loading, setLoading] = useState<string>("");
  const [error, setError] = useState<string>("");

  const clearError = () => setError("");

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !newRate) {
      setError("Please provide both API key and new rate");
      return;
    }

    setLoading("rate");
    setError("");
    setRateResult(null);

    try {
      const result = await adminApi.updateRate(parseFloat(newRate), apiKey);
      setRateResult(result);
    } catch (err: any) {
      setError(
        "Rate update failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading("");
    }
  };

  const handleUpdateMinDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !newMinDuration) {
      setError("Please provide both API key and new minimum duration");
      return;
    }

    setLoading("duration");
    setError("");
    setDurationResult(null);

    try {
      const result = await adminApi.updateMinDuration(
        parseInt(newMinDuration),
        apiKey
      );
      setDurationResult(result);
    } catch (err: any) {
      setError(
        "Duration update failed: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading("");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="mb-1">Admin Dashboard</h1>
            <p className="mb-0 text-secondary">
              System configuration and management
            </p>
          </div>
        </div>
      </div>

      <div className="warning">
        <strong>Administrative Access Required:</strong> All admin operations
        require a valid API key for authentication. Ensure you have the proper
        permissions before making changes to system settings.
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

      {/* API Key Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="mb-1">Authentication</h2>
            <p className="mb-0 text-secondary">
              Enter your admin API key to access system controls
            </p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">Admin API Key:</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your admin API key (from environment variables)"
            required
          />
          <small className="text-secondary">
            This key should match the ADMIN_API_KEY in your backend environment
          </small>
        </div>

        <div className={`info ${apiKey ? "success" : ""}`}>
          {apiKey ? (
            <span>API key configured - you can now use admin functions</span>
          ) : (
            <span>API key required to access admin functions</span>
          )}
        </div>
      </div>

      <div className="form-row">
        {/* Update Rate Section */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="mb-1">Update Storage Rate</h2>
              <p className="mb-0 text-secondary">
                Configure pricing per byte per day
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateRate}>
            <div className="form-group">
              <label htmlFor="rate">New Rate (SOL per byte per day):</label>
              <input
                type="number"
                id="rate"
                step="0.000000001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="e.g., 0.000001"
                required
              />
              <small className="text-secondary">
                Current rate affects all new storage calculations.
                {newRate &&
                  ` Preview: 1MB for 30 days = ${(
                    parseFloat(newRate) *
                    1048576 *
                    30
                  ).toFixed(6)} SOL`}
              </small>
            </div>

            <button
              type="submit"
              disabled={loading === "rate" || !apiKey}
              className={loading === "rate" ? "loading" : ""}
            >
              {loading === "rate" ? "Updating..." : "Update Rate"}
            </button>
          </form>

          {rateResult && (
            <div className="result-container">
              <h3 className="text-success">Rate Updated Successfully!</h3>
              <div style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                <strong className="text-accent">New Rate:</strong> {newRate} SOL
                per byte per day
              </div>
              <pre>{JSON.stringify(rateResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Update Minimum Duration Section */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="mb-1">Update Minimum Duration</h2>
              <p className="mb-0 text-secondary">
                Set minimum storage period requirements
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateMinDuration}>
            <div className="form-group">
              <label htmlFor="minDuration">New Minimum Duration (days):</label>
              <input
                type="number"
                id="minDuration"
                value={newMinDuration}
                onChange={(e) => setNewMinDuration(e.target.value)}
                placeholder="e.g., 30"
                min="1"
                required
              />
              <small className="text-secondary">
                Users cannot store files for less than this duration. Current
                setting applies to all new storage requests.
              </small>
            </div>

            <button
              type="submit"
              disabled={loading === "duration" || !apiKey}
              className={loading === "duration" ? "loading" : ""}
            >
              {loading === "duration" ? "Updating..." : "⏱Update Duration"}
            </button>
          </form>

          {durationResult && (
            <div className="result-container">
              <h3 className="text-success">Minimum Duration Updated!</h3>
              <div style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                <strong className="text-accent">New Minimum Duration:</strong>{" "}
                {newMinDuration} days
              </div>
              <pre>{JSON.stringify(durationResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="mb-1">System Information</h3>
            <p className="mb-0 text-secondary">
              Current configuration overview
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <div className="info">
            <strong>📊 Current Rate:</strong>
            <br />
            {newRate || "Not set"} SOL per byte per day
          </div>
          <div className="info">
            <strong>⏱️ Minimum Duration:</strong>
            <br />
            {newMinDuration || "Not set"} days
          </div>
          <div className="info">
            <strong>🔐 Authentication:</strong>
            <br />
            {apiKey ? "Configured" : "Required"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
