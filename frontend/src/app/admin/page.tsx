"use client";

import React, { useState } from "react";
import { adminApi } from "../../services/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import SocialFooter from "@/components/SocialFooter";

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
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-black font-semibold text-4xl sm:text-5xl lg:text-6xl mb-4">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 text-lg sm:text-xl">
            System configuration and management
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="text-yellow-800">
            <strong>Administrative Access Required:</strong> All admin
            operations require a valid API key for authentication. Ensure you
            have the proper permissions before making changes to system
            settings.
          </div>
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
              🔐
            </div>
            <div>
              <h2 className="text-black text-2xl font-bold mb-1">
                Authentication
              </h2>
              <p className="text-gray-600">
                Enter your admin API key to access system controls
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="apiKey"
              className="block text-black font-semibold mb-3"
            >
              Admin API Key:
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your admin API key (from environment variables)"
              className="w-full p-3 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <div className="text-gray-600 text-sm mt-1">
              This key should match the ADMIN_API_KEY in your backend
              environment
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              apiKey
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {apiKey ? (
              <span>
                ✅ API key configured - you can now use admin functions
              </span>
            ) : (
              <span>🔑 API key required to access admin functions</span>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <h2 className="text-black text-2xl font-bold mb-1">
                  Update Storage Rate
                </h2>
                <p className="text-gray-600">
                  Configure pricing per byte per day
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateRate}>
              <div className="mb-6">
                <label
                  htmlFor="rate"
                  className="block text-black font-semibold mb-3"
                >
                  New Rate (SOL per byte per day):
                </label>
                <input
                  type="number"
                  id="rate"
                  step="0.000000001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="e.g., 0.000001"
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  Current rate affects all new storage calculations.
                  {newRate &&
                    ` Preview: 1MB for 30 days = ${(
                      parseFloat(newRate) *
                      1048576 *
                      30
                    ).toFixed(6)} SOL`}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading === "rate" || !apiKey}
                className={loading === "rate" ? "opacity-75" : ""}
              >
                {loading === "rate" ? "Updating..." : "Update Rate"}
              </Button>
            </form>

            {rateResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                <h3 className="text-green-800 text-xl font-bold mb-4">
                  Rate Updated Successfully!
                </h3>
                <div className="mb-4 text-lg">
                  <span className="font-semibold text-purple-600">
                    New Rate:
                  </span>{" "}
                  {newRate} SOL per byte per day
                </div>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(rateResult, null, 2)}
                </pre>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                ⏱️
              </div>
              <div>
                <h2 className="text-black text-2xl font-bold mb-1">
                  Update Minimum Duration
                </h2>
                <p className="text-gray-600">
                  Set minimum storage period requirements
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateMinDuration}>
              <div className="mb-6">
                <label
                  htmlFor="minDuration"
                  className="block text-black font-semibold mb-3"
                >
                  New Minimum Duration (days):
                </label>
                <input
                  type="number"
                  id="minDuration"
                  value={newMinDuration}
                  onChange={(e) => setNewMinDuration(e.target.value)}
                  placeholder="e.g., 30"
                  min="1"
                  className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="text-gray-600 text-sm mt-1">
                  Users cannot store files for less than this duration. Current
                  setting applies to all new storage requests.
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading === "duration" || !apiKey}
                className={loading === "duration" ? "opacity-75" : ""}
              >
                {loading === "duration" ? "Updating..." : "Update Duration"}
              </Button>
            </form>

            {durationResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                <h3 className="text-green-800 text-xl font-bold mb-4">
                  Minimum Duration Updated!
                </h3>
                <div className="mb-4 text-lg">
                  <span className="font-semibold text-purple-600">
                    New Minimum Duration:
                  </span>{" "}
                  {newMinDuration} days
                </div>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(durationResult, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        </div>

        <SocialFooter />
      </div>
    </div>
  );
};

export default AdminDashboard;
