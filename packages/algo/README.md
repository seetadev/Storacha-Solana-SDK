## @toju.network/algo

Agent-friendly client for autonomous storage payments via the [x402 protocol](https://x402.org) on Algorand. Store files on IPFS and pay with ALGO — no human intervention required.

**Features:**

- Automatic x402 payment negotiation over Algorand (no manual auth flow)
- Estimate storage costs in ALGO before uploading
- Single-file uploads with configurable storage duration
- Supports both `mainnet` and `testnet` environments
- Works with any Algorand mnemonic (LangChain, CrewAI, AutoGen, custom agents)

**Looking for other payment options?**
- SOL payments → [@toju.network/sol](https://www.npmjs.com/package/@toju.network/sol)
- Filecoin USDFC → [@toju.network/fil](https://www.npmjs.com/package/@toju.network/fil)
- Base USDC (EVM x402) → [@toju.network/x402](https://www.npmjs.com/package/@toju.network/x402)

## Install

```shell
pnpm add @toju.network/algo
```

## Quick start

```ts
import { createAlgoAgentClient } from '@toju.network/algo'

const client = createAlgoAgentClient({
  mnemonic: process.env.ALGO_MNEMONIC!, // 25-word Algorand mnemonic
  environment: 'mainnet',
})

const file = new File([Buffer.from('hello world')], 'hello.txt', { type: 'text/plain' })
const result = await client.store(file, { durationDays: 30 })

console.log('CID:', result.cid)
console.log('Expires:', result.expiresAt)
console.log('Payment TX:', result.paymentTxId)
```

The client handles the full x402 flow automatically:
1. Sends the request → receives the `402 Payment Required` response
2. Builds and signs an Algorand payment transaction
3. Submits the transaction and waits for on-chain confirmation
4. Retries the upload with the signed transaction in the `X-PAYMENT` header

No polling, no manual signing, no wallet popups.

## Environments

```ts
// Algorand Testnet + staging-api.toju.network
const client = createAlgoAgentClient({ mnemonic, environment: 'testnet' })

// Algorand Mainnet + api.toju.network
const client = createAlgoAgentClient({ mnemonic, environment: 'mainnet' })
```

## Estimate cost

Before uploading, check how much a given file and duration will cost:

```ts
const estimate = await client.estimateStorageCost(1_000_000, 30) // 1 MB for 30 days

console.log(`Cost: ${estimate.algo} ALGO`)
console.log(`Approx: $${estimate.usd} USD`)
console.log(`Exact: ${estimate.microAlgo} microALGO`)
```

## Store a file

```ts
const file = new File([fileBuffer], 'report.pdf', { type: 'application/pdf' })

const result = await client.store(file, { durationDays: 7 })

console.log(result.cid)          // bafy...
console.log(result.expiresAt)    // ISO date string
console.log(result.fileName)     // 'report.pdf'
console.log(result.fileSize)     // bytes
console.log(result.paymentTxId)  // Algorand transaction ID
```

Your agent's wallet needs ALGO on the appropriate network. Get testnet ALGO from the [Algorand Testnet Faucet](https://bank.testnet.algorand.network/).

## Custom Algorand node

By default the client uses Algonode's free public nodes. For production workloads, pass your own:

```ts
const client = createAlgoAgentClient({
  mnemonic: process.env.ALGO_MNEMONIC!,
  environment: 'mainnet',
  algodServer: 'https://mainnet-api.nodely.io',
  algodToken: process.env.NODELY_API_KEY!,
})
```

## Links

- [Documentation](https://docs.toju.network)
- [Pricing](https://docs.toju.network/pricing)
- [x402 Protocol](https://x402.org)
- [Algorand Developer Portal](https://developer.algorand.org)
- [GitHub](https://github.com/tojunetwork/afara)

## Contributing

See the [Contributing guide](../../CONTRIBUTING.md).
