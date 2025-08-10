"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletConnection from "./WalletConnection";
import { useWallet } from "../contexts/WalletContext";

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { handleWalletConnected, handleWalletDisconnected } = useWallet();

  return (
    <nav className="navbar">
      <ul>
        <li>
          <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚀</span>
            <span>Storacha × Solana</span>
          </div>
        </li>
        <li>
          <Link href="/" className={pathname === "/" ? "active" : ""}>
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/user"
            className={pathname === "/user" ? "active" : ""}
          >
            User Dashboard
          </Link>
        </li>
        <li>
          <Link
            href="/admin"
            className={pathname === "/admin" ? "active" : ""}
          >
            Admin Dashboard
          </Link>
        </li>
        <li>
          <WalletConnection
            onWalletConnected={handleWalletConnected}
            onWalletDisconnected={handleWalletDisconnected}
          />
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;