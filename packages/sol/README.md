## @toju.network/sol

Pay for decentralized storage on IPFS via Storacha with SOL. No credit cards, no subscriptions.

**Features:**

- Estimate upload costs based on file size and duration
- Pay for storage with SOL via on-chain escrow
- Single and multi-file (directory) uploads
- Upload history with expiration tracking
- Email warnings before files expire
- Storage renewal — extend duration for existing uploads
- Automatic cleanup of expired files

**Looking for USDFC/Filecoin payments?** See [@toju.network/fil](https://npmx.dev/package/@toju.network/fil).

## Install

```shell
pnpm add @toju.network/sol
```

You'll also need a Solana wallet adapter. We recommend [@solana/wallet-adapter-react](https://www.npmx.dev/package/@solana/wallet-adapter-react).

## Quick start

```tsx
import { useUpload, Environment } from '@toju.network/sol';
import { useWallet } from '@solana/wallet-adapter-react';

const UploadComponent = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [duration, setDuration] = useState(30);
  const client = useUpload(Environment.testnet);
  const { publicKey, signTransaction } = useWallet();

  const handleUpload = async () => {
    const result = await client.createDeposit({
      file: files,
      durationDays: duration,
      payer: publicKey,
      signTransaction: async (tx) => {
        const signed = await signTransaction(tx);
        return signed;
      },
    });

    if (result.success) {
      console.log('Uploaded:', result.cid);
      console.log('Transaction:', result.signature);
      console.log('IPFS URL:', result.url);
    }
  };

  return <>// your markup</>;
};
```

## Environments

```ts
import { Environment } from '@toju.network/sol';

const client = useUpload(Environment.testnet);  // Solana Devnet
const client = useUpload(Environment.mainnet);  // Solana Mainnet
```

You can also pass a custom API endpoint and RPC URL:

```ts
const client = useUpload(Environment.mainnet, 'https://api.toju.network', 'https://your-rpc.com');
```

## Estimate cost

Check the cost before uploading:

```ts
const estimate = await client.estimateStorageCost(files, 30);

console.log(`Cost: ${estimate.costInSOL} SOL ($${estimate.costInUSD})`);
console.log(`Size: ${estimate.totalSizeInMB} MB`);
```

## Upload files

```ts
const result = await client.createDeposit({
  file: files,
  durationDays: 30,
  payer: publicKey,
  userEmail: 'user@example.com', // optional — get warned 7 days before expiry
  signTransaction: async (tx) => {
    const signed = await signTransaction(tx);
    return signed;
  },
});
```

**Tip:** Check if the user's wallet balance covers the estimated cost before calling `createDeposit`.

## Upload history

```ts
const history = await client.getUserUploadHistory(publicKey.toString(), page, limit);

console.log(history.userHistory);  // array of uploads
console.log(history.totalFiles);
console.log(history.totalStorage);
```

Each upload includes: file name, size, type, CID, expiration date, deletion status (`active` | `warned` | `deleted`), transaction hash, and IPFS gateway URL.

## Storage renewal

Extend storage before it expires:

```ts
// get a quote
const quote = await client.getStorageRenewalCost(cid, 30);
console.log(`Cost: ${quote.costInSOL} SOL`);
console.log(`New expiration: ${quote.newExpirationDate}`);

// renew
const result = await client.renewStorageDuration({
  cid,
  additionalDays: 30,
  payer: publicKey,
  signTransaction: async (tx) => {
    const signed = await signTransaction(tx);
    return signed;
  },
});
```

Renewal keeps the same CID — existing links stay valid.

## SOL price

Get real-time SOL/USD price (via Pyth Network):

```ts
const price = await client.getSolPrice();
console.log(`SOL: $${price}`);
```

## Vite setup

If you hit `ReferenceError: process is not defined`, add the node polyfills plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  },
});
```

## Links

- [Documentation](https://docs.toju.network)
- [SDK Reference](https://docs.toju.network/sdk/overview)
- [Pricing](https://docs.toju.network/pricing)
- [GitHub](https://github.com/seetadev/Storacha-Solana-SDK)

## Contributing

See the [Contributing guide](../../CONTRIBUTING.md).
