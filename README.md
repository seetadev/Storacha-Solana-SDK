# toju (keep) - Decentralized Storage on Solana

**toju** is a pay-as-you-go decentralized storage solution on Solana. Store files on IPFS via Storacha and pay with native SOL - no credit cards, no subscriptions.

## Features

- Pay storage fees directly with SOL
- No credit cards or subscriptions required
- Files stored on IPFS via Storacha (Filecoin-backed)
- Email notifications before storage expires
- Automatic cleanup of expired files

## Quick Start

### Using the SDK

```bash
npm install @toju.network/sol
```

```typescript
import { Client, Environment } from '@toju.network/sol';

const client = new Client({
  environment: Environment.testnet,
});

// Estimate storage cost
const cost = await client.estimateStorageCost([file], 30 * 86400); // 30 days in seconds
console.log(`Cost: ${cost.sol} SOL`);

// Upload a file
const result = await client.createDeposit({
  payer: publicKey,        // from wallet adapter
  file: [file],
  durationDays: 30,
  signTransaction,         // from wallet adapter
  userEmail: 'user@example.com', // optional, for expiry notifications
});

console.log(`File CID: ${result.cid}`);
```

### Using the Web App

Visit [toju.network](https://toju.network) to upload files directly from your browser.

## Documentation

Full documentation available at [docs.toju.network](https://docs.toju.network)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## Links

- [Website](https://toju.network)
- [Documentation](https://docs.toju.network)
- [GitHub](https://github.com/seetadev/Storacha-Solana-SDK)

## License

MIT
