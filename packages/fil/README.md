# @toju.network/fil

> Payment bridge for IPFS storage on Filecoin network using USDFC

## Status

🚧 **In Development** - Coming soon

## Overview

This package enables Filecoin-native payments for decentralized storage via Storacha, using USDFC (1:1 USD stablecoin on Filecoin).

## Planned Features

- Direct USDFC token transfers for storage payments
- Transaction verification via ethers.js on Filecoin mainnet
- React hooks for browser/wallet integration
- Cost estimation based on file size and duration
- Storage renewal capabilities
- TypeScript SDK with full type safety

## Architecture

```
User → @toju.network/fil → Server (ethers.js) → Storacha
```

Payment flow:
1. User estimates cost in USDFC
2. Transfers USDFC to toju wallet address
3. Server verifies transaction on Filecoin using ethers.js
4. Uploads file to Storacha/IPFS
5. Returns CID to user

**Note:** No smart contracts are used. The server directly verifies token transfers using ethers.js.

## Installation

```bash
# Not yet published
npm install @toju.network/fil
```

## Usage

```typescript
// Coming soon
import { Client } from '@toju.network/fil';

const client = new Client({
  network: 'mainnet',
  apiUrl: 'https://api.toju.network',
});

const cost = await client.estimateStorageCost([file], 30); // 30 days
const result = await client.createDeposit({
  payer: address,
  files: [file],
  durationDays: 30,
});
```

## Technical Details

- **No smart contracts**: Direct token transfer verification
- **ethers.js integration**: For interacting with Filecoin EVM
- **USDFC token**: 1:1 USD stablecoin on Filecoin
- **Server-side verification**: Backend confirms payment before uploading

## Roadmap

See [GitHub Discussion](../../discussions) for FIL integration roadmap.

## Related Packages

- [`@toju.network/sol`](../sol) - Solana payments (live on mainnet)
- [`@toju.network/eth`](../eth) - Ethereum/Base payments (planned)

## License

Apache-2.0
