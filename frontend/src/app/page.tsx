import React from "react";
import Link from "next/link";

const Home: React.FC = () => {
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-icon">🚀</div>
          <div>
            <h1 className="mb-1">Storacha × Solana SDK</h1>
            <p className="mb-0 text-secondary">
              Decentralized Storage Testing Platform
            </p>
          </div>
        </div>

        <p className="mb-3">
          Welcome to the comprehensive testing interface for the Storacha Solana
          SDK. This platform enables you to interact with decentralized storage
          capabilities powered by Storacha's infrastructure and Solana's
          high-performance blockchain.
        </p>
      </div>

      <div className="form-row">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">👤</div>
            <div>
              <h2 className="mb-1">User Operations</h2>
              <p className="mb-0 text-secondary">
                File management and delegation
              </p>
            </div>
          </div>

          <ul className="mb-3" style={{ listStyle: "none", padding: 0 }}>
            <li className="mb-2">
              📁 <strong>File Upload:</strong> Store files on Storacha network
            </li>
            <li className="mb-2">
              🔐 <strong>UCAN Delegations:</strong> Create secure access
              delegations
            </li>
            <li className="mb-2">
              💰 <strong>Storage Quotes:</strong> Calculate storage costs
            </li>
          </ul>

          <Link href="/user">
            <button className="button-success" style={{ width: "100%" }}>
              Access User Dashboard →
            </button>
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-icon">⚙️</div>
            <div>
              <h2 className="mb-1">Admin Operations</h2>
              <p className="mb-0 text-secondary">System configuration</p>
            </div>
          </div>

          <ul className="mb-3" style={{ listStyle: "none", padding: 0 }}>
            <li className="mb-2">
              📊 <strong>Rate Management:</strong> Update storage pricing
            </li>
            <li className="mb-2">
              ⏱️ <strong>Duration Settings:</strong> Configure minimum storage
              periods
            </li>
            <li className="mb-2">
              🔒 <strong>Secure Access:</strong> API key authentication required
            </li>
          </ul>

          <Link href="/admin">
            <button className="button-secondary" style={{ width: "100%" }}>
              Access Admin Dashboard →
            </button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>🛠️ Development Setup</h3>
        <p className="mb-2">To get started with testing:</p>
        <ol style={{ color: "var(--text-secondary)" }}>
          <li>
            Ensure your backend server is running on{" "}
            <code>http://localhost:3000</code>
          </li>
          <li>
            For admin operations, obtain a valid API key from your environment
            variables
          </li>
          <li>
            Use the User Dashboard to test file operations and delegations
          </li>
          <li>Use the Admin Dashboard to configure system parameters</li>
        </ol>
      </div>
    </div>
  );
};

export default Home;
