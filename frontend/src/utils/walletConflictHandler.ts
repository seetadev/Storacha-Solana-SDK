/**
 * Wallet Conflict Handler
 *
 * Handles conflicts between multiple wallet extensions (MetaMask, Phantom, Brave Wallet)
 * trying to inject window.ethereum.
 *
 * I've got multiple wallet providers installed in browser which led to this issue.
 */

export interface WalletConflictInfo {
  hasConflict: boolean;
  detectedWallets: string[];
  recommendations: string[];
}

/**
 * Detects which wallet extensions are installed
 */
export function detectInstalledWallets(): string[] {
  const detected: string[] = [];

  if (typeof window === "undefined") {
    return detected;
  }

  if (window.phantom?.solana) {
    detected.push("Phantom");
  }

  if (window.ethereum?.isMetaMask) {
    detected.push("MetaMask");
  }

  if (window.ethereum?.isBraveWallet) {
    detected.push("Brave Wallet");
  }

  if (window.ethereum?.isCoinbaseWallet) {
    detected.push("Coinbase Wallet");
  }

  return detected;
}

/**
 * Checks if there's a potential wallet conflict
 */
export function checkWalletConflict(): WalletConflictInfo {
  const detectedWallets = detectInstalledWallets();
  const hasMultipleEthereumProviders = detectedWallets.length > 1;

  const recommendations: string[] = [];

  if (hasMultipleEthereumProviders) {
    recommendations.push(
      "Multiple wallet extensions detected that may conflict.",
      "For development on Solana, disable Brave Wallet crypto features:",
      "1. Open brave://settings/web3",
      '2. Set "Default Ethereum wallet" to "None"',
      '3. Set "Default Solana wallet" to "None"',
      "4. Refresh the page",
    );

    if (detectedWallets.includes("Brave Wallet")) {
      recommendations.push(
        "Note: You can re-enable Brave Wallet for production use.",
      );
    }
  }

  return {
    hasConflict: hasMultipleEthereumProviders,
    detectedWallets,
    recommendations,
  };
}

/**
 * Displays wallet conflict warnings in console
 */
export function warnAboutWalletConflicts(): WalletConflictInfo {
  const conflictInfo = checkWalletConflict();

  if (conflictInfo.hasConflict) {
    console.warn("⚠️ Wallet Extension Conflict Detected");
    console.warn("Detected wallets:", conflictInfo.detectedWallets.join(", "));
    console.warn("\nRecommendations:");
    conflictInfo.recommendations.forEach((rec, idx) => {
      console.warn(`${idx + 1}. ${rec}`);
    });
  }

  return conflictInfo;
}

/**
 * Attempts to get the correct Solana provider (prioritizing Phantom)
 */
export function getSolanaProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.phantom?.solana) {
    return window.phantom.solana;
  }

  if (window.solana) {
    return window.solana;
  }

  return null;
}

declare global {
  interface Window {
    phantom?: {
      solana?: any;
      ethereum?: any;
    };
    solana?: any;
    ethereum?: any;
  }
}
