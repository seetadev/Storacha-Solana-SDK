## @toju.network/x402

Agent-friendly client for autonomous storage payments via the [x402 protocol](https://x402.org). Store files on IPFS and pay with USDC on Base — no human intervention required.

**Features:**

- Automatic x402 payment negotiation (no manual auth flow)
- Estimate storage costs in USDC before uploading
- Single-file uploads with configurable storage duration
- Supports both `mainnet` and `sepolia` environments
- Works with any EVM-compatible private key (LangChain, CrewAI, AutoGen, custom agents)

**Looking for human wallet payments?** See [@toju.network/sol](https://www.npmjs.com/package/@toju.network/sol) (Solana) or [@toju.network/fil](https://www.npmjs.com/package/@toju.network/fil) (Filecoin).

## Install

```shell
pnpm add @toju.network/x402
```

## Quick start

```ts
import { createAgentClient } from '@toju.network/x402'

const client = createAgentClient({
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
  environment: 'mainnet',
})

const file = new File([Buffer.from('hello world')], 'hello.txt', { type: 'text/plain' })
const result = await client.store(file, { durationDays: 30 })

console.log('CID:', result.cid)
console.log('Expires:', result.expiresAt)
```

The client handles the full x402 flow automatically: sends the request, receives the 402 Payment Required response, signs the EIP-3009 off-chain authorization, and retries with the payment header attached. No polling, no manual signing.

## Environments

```ts
const client = createAgentClient({ privateKey, environment: 'sepolia' })  // Base Sepolia (testnet)
const client = createAgentClient({ privateKey, environment: 'mainnet' })  // Base Mainnet
```

## Estimate cost

Before uploading, check how much a given file and duration will cost:

```ts
const estimate = await client.estimateStorageCost(1_000_000, 30) // 1MB for 30 days

console.log(`Cost: ${estimate.usdc} USDC`)
console.log(`Approx: $${estimate.usd}`)
```

`sizeInBytes` is the raw byte count of the file. `durationDays` is how long to keep it on IPFS.

## Store a file

```ts
const file = new File([fileBuffer], 'report.pdf', { type: 'application/pdf' })

const result = await client.store(file, { durationDays: 7 })

console.log(result.cid)       // bafy...
console.log(result.expiresAt) // ISO date string
console.log(result.fileName)  // 'report.pdf'
console.log(result.fileSize)  // bytes
```

Your agent's wallet needs USDC on Base to pay. Get test USDC on Base Sepolia from [Circle's faucet](https://faucet.circle.com/).

## USDC contract addresses

| Network | Contract Address |
|---|---|
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

USDC uses 6 decimal places on all EVM chains.

## Links

- [Documentation](https://docs.toju.network)
- [Pricing](https://docs.toju.network/pricing)
- [x402 Protocol](https://x402.org)
- [GitHub](https://github.com/tojunetwork/afara)

## Contributing

See the [Contributing guide](../../CONTRIBUTING.md).
