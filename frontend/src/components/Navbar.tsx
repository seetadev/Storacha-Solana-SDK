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
    <nav className="w-full flex flex-row gap-8 py-8 items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <img
          src="/Storacha.png"
          alt="Storacha Logo"
          style={{ width: "164px" }}
        />
      </div>

      <div>
        <Link href="/user" className={pathname === "/user" ? "active" : ""}>
          User Dashboard
        </Link>
      </div>
      <div>
        <Link href="/admin" className={pathname === "/admin" ? "active" : ""}>
          Admin Dashboard
        </Link>
      </div>
      <div>
        <WalletConnection
          onWalletConnected={handleWalletConnected}
          onWalletDisconnected={handleWalletDisconnected}
        />
      </div>
    </nav>
  );
};

export default Navbar;
