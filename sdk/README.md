## Storacha SOL

Crypto-native payments for storage on Storacha with SOL. No credit card needed.

Here are a couple of things you can do with this package:

- Estimate upload fees based on the file size and duration
- Make SOL payments for Storage on Storacha

Stuffs we hope to cover or extend:

- Multiple file (directory) uploads
- List stored items in a wallet's space (space-management, pretty-much)
- Allow payments from other chains. (Filecoin next)
- Include implementations for other libs. Right now, we only have React. Hoping to cover, Vue, Svelte etc.
- Show how much time is left to expiry and add ability to renew/icrease upload duration

## Usage

First, install the package with your preferred package manager

```shell
pnpm add storacha-sol
```

The package exposes a react hook `useDeposit` which you can access the `client` with. Because this runs on Solana for now, you'll need to install any of your preferred solana wallet-adapter libs tailored for React or JS in general

We recommend this one: [@solana/wallet-adpater-react](https://www.npmjs.com/package/@solana/wallet-adapter-react). It'll come in handy when you'll need it to sign the transaction from `client.createDeposit(args)`

In your component, import the `useDeposit` hook like so:

```tsx
import { useDeposit } from 'storacha-sol';

const UploadComponent = () => {
  const client = useDeposit('testnet');
  return <>// some markup</>;
};
```

From the snippet above, you'll see that the hook takes an environment argument `"testnet"`. If you leave it as is, Typescript would start crying. So, to appease it, you should import the `Environment` type from `storacha-sol` and infer it.

```ts
import { useDeposit, Environment } from "storacha-sol"
...

const client = useDeposit("testnet" as Environment)
```

In your component, we'll assume you already have file and duration state variables

```tsx
import { useDeposit, Environment } from 'storacha-sol';
import { useSolanaWallet } from '@solana/wallet-adapter-react';

const UploadComponent = () => {
  const [selectedFiles, setSelectedFiles] = useState<File>();
  const [storageDuration, setStorageDuration] = useState(30);
  const client = useDeposit('testnet' as Environment);
  const { publicKey, signTransaction } = useSolanaWallet();

  return <>// some markup</>;
};
```

`createDeposit` expects the following args: `payer` (which is the publicKey, imported from wallet-adapter), `file`, `duration`, and the callback to sign a transaction.

See a sample of how you can achieve this below:

```ts
const result = await client.createDeposit({
  file,
  durationDays: storageDuration,
  payer: publicKey,
  signTransaction: async (tx) => {
    toast.loading('Please sign the transaction in your wallet...', {
      id: 'upload-progress',
    });

    try {
      const signed = await signTransaction(tx);
      toast.loading('Transaction sent to network...', {
        id: 'upload-progress',
      });

      return signed;
    } catch (signError) {
      console.error('❌ Transaction signing failed:', signError);
      throw new Error(
        `Transaction signing failed: ${signError instanceof Error ? signError.message : 'Unknown error'}`
      );
    }
  },
});
```

`storacha-sol` is type-safe, so you can always explore the content of the declaration file to see the structure. You could take a look at `UploadResult`, for starters.

and when `result` is successful, you can proceed with any other action you choose to carry out in your app.

```ts
if (result.success) {
  // do more stuff
}
```

An edge-case you may want to consider before calling `createDeposit` is to check if the estimated storage cost is more than the wallet balance of the user, as this would fail to create the transaction.

You can use `client.estimateStorageCost` to get the values in SOL and compare if the balance is less than what was estimated before paying and provide a reasonable error message for your end-users.

## Want to contribute?

Read the [Contributing guide](CONTRIBUTING.md)
