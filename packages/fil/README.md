## @toju.network/fil

Pay for decentralized storage on IPFS via Storacha with USDFC (Filecoin stablecoin). No credit cards, no subscriptions.

**Features:**

- Estimate upload costs in USDFC (1:1 with USD)
- Pay for storage with USDFC via ERC-20 transfer
- Single and multi-file (directory) uploads
- Upload history with expiration tracking
- Email warnings before files expire
- Storage renewal — extend duration for existing uploads
- Automatic cleanup of expired files

**Looking for SOL payments?** See [@toju.network/sol](https://npmx.dev/package/@toju.network/sol).

## Install

```shell
pnpm add @toju.network/fil
```

You'll also need [wagmi](https://wagmi.sh/) for wallet connection and transaction signing.

## Quick start

```tsx
import { useUpload, Environment } from '@toju.network/fil';
import { useAccount, useWriteContract } from 'wagmi';

const UploadComponent = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [duration, setDuration] = useState(30);
  const client = useUpload(Environment.calibration);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleUpload = async () => {
    const result = await client.createDeposit({
      userAddress: address,
      file: files,
      durationDays: duration,
      sendTransaction: async (txData) => {
        const hash = await writeContractAsync({
          address: txData.contractAddress,
          abi: txData.abi,
          functionName: 'transfer',
          args: [txData.recipient, txData.amount],
        });
        return hash;
      },
    });

    if (result.success) {
      console.log('Uploaded:', result.cid);
      console.log('Transaction:', result.transactionHash);
    }
  };

  return <>// your markup</>;
};
```

## Environments

```ts
import { Environment } from '@toju.network/fil';

const client = useUpload(Environment.calibration); // Filecoin Calibration (testnet)
const client = useUpload(Environment.mainnet);      // Filecoin Mainnet
```

You can also pass a custom API endpoint and RPC URL:

```ts
const client = useUpload(Environment.mainnet, 'https://your-rpc.com', 'https://api.toju.network');
```

## Estimate cost

```ts
const estimate = await client.estimateStorageCost(files, 30);

console.log(`Cost: ${estimate.usdfc} USDFC ($${estimate.usd})`);
```

USDFC is pegged 1:1 to USD — no price conversion needed.

## Upload files

```ts
const result = await client.createDeposit({
  userAddress: address,
  file: files,
  durationDays: 30,
  userEmail: 'user@example.com', // optional — get warned 7 days before expiry
  sendTransaction: async (txData) => {
    const hash = await writeContractAsync({
      address: txData.contractAddress,
      abi: txData.abi,
      functionName: 'transfer',
      args: [txData.recipient, txData.amount],
    });
    return hash;
  },
});
```

**Note:** You'll need FIL (or tFIL on testnet) in your wallet for gas fees.

## Upload history

```ts
const history = await client.getUserUploadHistory(address, 1, 20);

console.log(history.data);  // array of uploads
console.log(history.total);
```

## Storage renewal

Extend storage before it expires:

```ts
// get a quote
const quote = await client.getStorageRenewalCost(cid, 30);
console.log(`Cost: ${quote.costInUsdfc} USDFC`);
console.log(`New expiration: ${quote.newExpirationDate}`);

// renew
const result = await client.renewStorageDuration({
  cid,
  duration: 30,
  userAddress: address,
  sendTransaction: async (txData) => {
    const hash = await writeContractAsync({
      address: txData.contractAddress,
      abi: txData.abi,
      functionName: 'transfer',
      args: [txData.recipient, txData.amount],
    });
    return hash;
  },
});
```

Renewal keeps the same CID — existing links stay valid.

## USDFC token contracts

| Network | Contract Address |
|---|---|
| Filecoin Mainnet | `0x80B98d3aa09ffff255c3ba4A241111Ff1262F045` |
| Filecoin Calibration | `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0` |

## Getting test tokens

1. Get **tFIL** (for gas) from the [Filecoin Calibration Faucet](https://faucet.calibnet.chainsafe-fil.io/)
2. Mint **test USDFC** at [stg.usdfc.net](https://stg.usdfc.net)

## Links

- [Documentation](https://docs.toju.network)
- [SDK Reference](https://docs.toju.network/sdk/overview)
- [Pricing](https://docs.toju.network/pricing)
- [GitHub](https://github.com/tojunetwork/afara)

## Contributing

See the [Contributing guide](../../CONTRIBUTING.md).
