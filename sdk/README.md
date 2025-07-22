## Storacha SOL SDK

This package (we need to decide on a package name, i guess @storacha/sol-sdk) provides an interface for interacting with the Storacha/Solana on-chain program and the server.

Here are a couple of things we intend for it to do:

- Estimate upload fees based on the file size and duration
- Make SOL payments for decentralized Storage on Storacha
- Request delegated upload URLs via the server from Storacha
- Upload CAR files with UCAN auth
- List stored items in a wallet's space (space-management, pretty-much)

## Usage

First, install the package with your preferred package manager

```shell
pnpm add @storacha/sol-sdk
```

Try making a sample fee estimation like so:

```ts
import { Client } from '@storacha/sol-sdk';

const client = new Client();

const fee = await client.estimateFees({
  size: 1024 * 500, // 500KB
  durationDays: 30,
});
```
