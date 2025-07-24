import React from "react";
import { Link, useLocation } from "react-router-dom";
import WalletConnection from "./WalletConnection";
import { useWallet } from "../contexts/WalletContext";

const Navbar: React.FC = () => {
  const location = useLocation();
  const { handleWalletConnected, handleWalletDisconnected } = useWallet();

  return (
    <nav className="navbar">
      <ul>
        <li>
          <div className="navbar-brand">Storacha × Solana</div>
        </li>
        <li>
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/user"
            className={location.pathname === "/user" ? "active" : ""}
          >
            User Dashboard
          </Link>
        </li>
        <li>
          <Link
            to="/admin"
            className={location.pathname === "/admin" ? "active" : ""}
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
