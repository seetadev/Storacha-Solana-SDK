# toju: pay-as-you-go decentralized storage on IPFS

**toju** is a crypto-native onramp for decentralized storage on IPFS. pay with SOL, USDFC, or USDC — no credit cards, no subscriptions. toju also supports agentic payments via the x402 protocol, enabling AI agents to pay for storage autonomously.

## Features

* **Native SOL payments** for storage — no credit cards, subscriptions, or off-chain billing
* **IPFS storage on a Kubo node**, ensuring decentralized, verifiable persistence
* **Pay-as-you-go pricing**, lowering friction for real storage usage and experimentation
* **Storage lifecycle management**, including automatic cleanup of expired files
* **Email notifications** before storage expiration to prevent unintended data loss
* **Developer-friendly SDK and CLI**, designed for easy integration into Solana applications


## Run locally

Uploads pin files on a Kubo IPFS node. The site charges 1 PPT on Arbitrum Sepolia per upload and per retrieve.

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 10](https://pnpm.io/installation) (`corepack enable && corepack prepare pnpm@10.11.0 --activate`)
- A Postgres database and its connection string ([Neon](https://neon.tech) works)
- [MetaMask](https://metamask.io/) on Arbitrum Sepolia, with a little ETH for gas and 1 PPT per upload or retrieve

### 1. Install

```bash
git clone https://github.com/tojunetwork/afara.git
cd afara
pnpm install
```

### 2. Configure the API

```bash
cd server
cp .env.example .env
```

Edit `server/.env`. The process exits on startup if any of these are empty:

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Add this line; it is not in the example file. |
| `ADMIN_API_KEY` | Any long random string. It guards the admin routes. |
| `QSTASH_CURRENT_SIGNING_KEY` | From [Upstash QStash](https://upstash.com/docs/qstash). Any non-empty placeholder is enough if you are not running scheduled jobs. |
| `QSTASH_NEXT_SIGNING_KEY` | Same as above. |
| `RESEND_API_KEY` | From [Resend](https://resend.com). Any non-empty placeholder is enough if you are not sending expiry email. |
| `KUBO_NODES` | Kubo RPC that should store the files. The example points at `https://kubo-render.onrender.com`. Use `http://127.0.0.1:5001` for a Kubo daemon on this machine. |
| `IPFS_GATEWAY` | Gateway that serves `/ipfs/<cid>`. For the hosted node, `https://kubo-render.onrender.com`. |
| `PPT_TREASURY` | Wallet that receives the 1 PPT fee. The example already has the project treasury. |
| `PPT_RPC_URL` | Arbitrum Sepolia RPC. The example already has the public endpoint. |

`PORT` defaults to `5040`.

Apply the database schema:

```bash
pnpm db:migrate
```

### 3. Configure the site

```bash
cd ../ui
cp .env.example .env
```

For a local API, set:

```bash
VITE_API_URL=http://localhost:5040
```

Leave `VITE_PPT_TREASURY` and `VITE_ARB_SEPOLIA_RPC_URL` as they are in the example unless you are pointing at a different treasury or RPC.

### 4. Start the API and the site

Two terminals, from the repo root:

```bash
cd server
pnpm dev
```

```bash
cd ui
pnpm dev
```

- API: [http://localhost:5040/health](http://localhost:5040/health)
- Site: [http://localhost:3000](http://localhost:3000)

### 5. Upload

1. Open [http://localhost:3000](http://localhost:3000).
2. Connect MetaMask and switch to Arbitrum Sepolia.
3. Choose a file and pay 1 PPT. The API pins it on the Kubo node in `KUBO_NODES`.
4. Retrieve is a second 1 PPT payment. The file is served from that same node: `https://<kubo-host>/ipfs/<cid>`.

Public gateways such as ipfs.io only work when that Kubo node is dialable on the public IPFS swarm. The hosted Render node is not, so use its own gateway.

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
- [Mainnet Demo](https://youtu.be/VqD2NWYqPDE)

**Staging (Testnet):**
- [Website](https://staging.toju.network)
- [API](https://staging-api.toju.network/health)

**Resources:**
- [Documentation](https://docs.toju.network)
- [GitHub](https://github.com/tojunetwork/afara)
- [NPM Package](https://www.npmjs.com/package/@toju.network/sol)

**Talk to us**
- [Discord Server](https://discord.gg/j6YEHyCV)

## License

Apache-2.0


