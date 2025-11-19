# Wallet Setup Guide

## Wallet Extension Conflicts

When developing with multiple wallet extensions (MetaMask, Phantom, Brave Wallet), you may encounter conflicts where extensions try to inject the same `window.ethereum` object, causing errors like:

```
Cannot redefine property: ethereum
```

### Solution for Development

To avoid conflicts during Solana development:

1. **Disable Brave Wallet** (recommended for development):
   - Open `brave://settings/web3` in your Brave browser
   - Set **"Default Ethereum wallet"** to **"None"**
   - Set **"Default Solana wallet"** to **"None"**
   - Refresh the application page

2. **Use Phantom for Solana**: Phantom wallet is the recommended wallet for Solana development and will work properly once Brave Wallet is disabled.

### For Production

In production, users can keep Brave Wallet enabled. The application will detect wallet conflicts and display a helpful banner with instructions.

### Automatic Detection

The application automatically:

- Detects when multiple wallet extensions are active
- Displays a warning banner with setup instructions
- Disables auto-connect when conflicts are detected
- Logs helpful debugging information to the console

### Technical Details

The conflict occurs because:

1. Phantom injects both `window.solana` (for Solana) and `window.ethereum` (for EVM chains)
2. Brave Wallet also tries to inject `window.ethereum`
3. JavaScript's `Object.defineProperty` prevents redefinition, causing the error

The solution in `/frontend/src/utils/walletConflictHandler.ts` handles this by:

- Detecting installed wallets
- Prioritizing Phantom's Solana provider
- Warning users about conflicts
- Providing clear resolution steps
