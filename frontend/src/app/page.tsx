"use client";

import React from "react";
import Link from "next/link";
import WalletConnection from "@/components/WalletConnection";
import { useWallet } from "@/contexts/WalletContext";
import {
  FaDiscord,
  FaGithub,
  FaMedium,
  FaYoutube,
  FaReddit,
} from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";
import { FaBluesky } from "react-icons/fa6";

const Home: React.FC = () => {
  const { handleWalletConnected, handleWalletDisconnected } = useWallet();

  return (
    <div>
      <div className="flex flex-row px-auto mx-auto mt-12 mb-30 w-full justify-between">
        <div className="text-black font-semibold text-6xl">
          Storacha Solana SDK
        </div>

        <div className="rounded-lg fex flex-col gap-2 bg-white drop-shadow-lg w-1/2 p-8">
          <div className="text-lg text-black font-bold">
            Go to User Dashboard
          </div>
          <div className="text-sm text-gray-500 mb-5">
            First, connect your Solana wallet
          </div>

          <WalletConnection
            onWalletConnected={handleWalletConnected}
            onWalletDisconnected={handleWalletDisconnected}
            className="w-full bg-purple-600 text-white text-center py-2 rounded-lg "
          />
        </div>
      </div>

      <footer className="bg-white border-purple-600 border-2 rounded-4xl p-8 mt-16">
        <div className="flex justify-between items-start mb-12">
          <button className="bg-purple-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-purple-700 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            JOIN MAILING LIST
          </button>

          {/* Social Media */}
          <div className="flex gap-6">
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaDiscord className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaGithub className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaMedium className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaYoutube className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <SiFarcaster className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaBluesky className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <FaReddit className="w-6 h-6" />
            </a>
          </div>

          {/* Resources */}
          <div className="flex gap-16">
            <div>
              <h3 className="text-purple-600 font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Quickstart Guide
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Status
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-purple-600 font-semibold mb-4">
                Getting Started
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    JS Client
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    CLI
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Web UI
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="">
            <img src="/storacha-vector.png" alt="" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
