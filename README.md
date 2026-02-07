# toju (keep) - Decentralized Storage on Solana Powered by Storacha & IPFS

**toju** is a pay-as-you-go decentralized storage solution for Solana that enables developers to store data on Filecoin-backed IPFS via Storacha, paying directly with native SOL — no credit cards, no subscriptions.

## Features

* **Native SOL payments** for storage — no credit cards, subscriptions, or off-chain billing
* **Filecoin-backed IPFS storage via Storacha**, ensuring decentralized, verifiable persistence
* **Pay-as-you-go pricing**, lowering friction for real storage usage and experimentation
* **Storage lifecycle management**, including automatic cleanup of expired files
* **Email notifications** before storage expiration to prevent unintended data loss
* **Developer-friendly SDK and CLI**, designed for easy integration into Solana applications


## Quick Start

### Using the SDK

```bash
npm install @toju.network/sol
```

#### Direct Usage (Node.js / Server-side)

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

#### React Hook

```typescript
import { useDeposit } from '@toju.network/sol';
import { useWallet } from '@solana/wallet-adapter-react';

function UploadComponent() {
  const { publicKey, signTransaction } = useWallet();
  const client = useDeposit('mainnet-beta', false);

  const handleUpload = async (files: File[]) => {
    const cost = await client.estimateStorageCost(files, 30 * 86400);
    
    const result = await client.createDeposit({
      payer: publicKey,
      file: files,
      durationDays: 30,
      signTransaction,
    });

    console.log(`Uploaded: ${result.cid}`);
    console.log("cost", cost)
  };

  return (
    <button onClick={() => handleUpload([file])}>
      Upload
    </button>
  );
}
```

### Using the Web App

- **Production (Mainnet):** [toju.network](https://toju.network)
- **Staging (Testnet):** [staging.toju.network](https://staging.toju.network)

## Documentation

Full documentation available at [docs.toju.network](https://docs.toju.network)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## Links

**Production (Mainnet):**
- [Website](https://toju.network)
- [API](https://api.toju.network/health)
- [Mainnet Demo](https://youtu.be/H6Ihbspmb6o)

**Staging (Testnet):**
- [Website](https://staging.toju.network)
- [API](https://staging-api.toju.network/health)

**Resources:**
- [Documentation](https://docs.toju.network)
- [GitHub](https://github.com/seetadev/Storacha-Solana-SDK)
- [NPM Package](https://www.npmjs.com/package/@toju.network/sol)

**Talk to us**
- [Discord Server](https://discord.gg/j6YEHyCV)

## License

Apache-2.0


## Help us Scale

<a href="https://filecoin.drips.network/app/projects/github/seetadev/Storacha-Solana-SDK" target="_blank"><img src="https://filecoin.drips.network/api/embed/project/https%3A%2F%2Fgithub.com%2Fseetadev%2FStoracha-Solana-SDK/support.png?background=dark&style=drips&text=me&stat=support" alt="Support Storacha-Solana-SDK on drips.network" height="32"></a>

