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
    <nav className="w-full flex flex-row gap-8 py-8 px-8 items-center justify-between p-4 text-purple-600">
      <div className="flex items-center gap-2">
        <Link href="/">
          <img
            src="/Storacha.png"
            alt="Storacha Logo"
            style={{ width: "164px" }}
          />
        </Link>
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
          className="bg-purple-600 text-white px-4 py-2 rounded-lg"
        />
      </div>
    </nav>
  );
};

export default Navbar;
