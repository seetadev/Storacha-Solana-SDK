# Storacha Onchain Payments (Solana)

**Storacha Onchain Payments** is a proof-of-concept system enabling **per-upload, pay-as-you-go decentralized storage payments on Solana**.
Users pay with **native SOL**, while a fiat-subscribed reseller account underwrites the storage service.
This monorepo contains the **Solana Payment Program**, **Backend API**, and **TypeScript SDK**.

## Features

* **Onchain Payments** – Pay storage fees directly with SOL.
* **No Credit Cards** – Pure crypto-native flow.
* **Escrow-based Rewards** – Funds released linearly per block to service providers.
* **Backend API with UCAN Delegation** – Secure storage delegation via UCAN tokens.
* **TypeScript SDK** – Easily integrate with dapps (supports Solana Mobile dapp publishing).
* **Extensible** – Designed for multi-chain support (Phase 2).

## Monorepo Structure

```
solana-programs/  # Solana payment contract (Anchor framework)
backend/          # Node.js backend API with UCAN storage delegation
sdk/              # TypeScript SDK (@storacha/sol-sdk)
```

## Quick Start

### **1. Prerequisites**

- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://solana.com/docs/intro/installation)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js >= 20](https://nodejs.org/en/) and [pnpm](https://pnpm.io/installation)
- (Optional) [Docker](https://www.docker.com/) for test validators

  * **IMPORTANT:** Install using the Anza installer to avoid SSL/archive issues:

    ```bash
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    ```
* [Anchor Framework](https://www.anchor-lang.com/docs/installation)
* [Node.js >= 20](https://nodejs.org/en/) and [pnpm](https://pnpm.io/installation)
* (Optional) [Docker](https://www.docker.com/) for test validators

### **2. Clone & Install Dependencies**

```bash
git clone https://github.com/seetadev/storacha-solana-sdk.git
cd storacha-solana-sdk
pnpm install
```

### **3. Solana Localnet Setup**

```bash
cd solana-programs

# If you're on macOS, you may need to remove old ledgers (fixes macOS ._genesis.bin errors)
rm -rf test-ledger

# Prevent macOS from creating ._ resource forks during extraction
export COPYFILE_DISABLE=true

# Start local validator
solana-test-validator
```

### **4. Build & Deploy the Solana Program**

In a new terminal:

```bash
cd solana-programs
anchor build
anchor deploy
```

### **5. Airdrop Some SOL**

```bash
solana airdrop 2
```

If it fails initially due to rate limits, retry after a few seconds. I'd recommend you get test with low amounts for now, say, 0.5 SOL as the maximun your can request for is 5.

Check if you've started the test-validator before requesting for the airdrop

### **6. Backend Server**

```bash
cd backend
pnpm dev
```

### **7. SDK**

```bash
cd sdk
pnpm build
```

## Testing

### **Anchor Program Tests**

```bash
cd solana-programs
anchor test
```

### **Backend Tests**

```bash
cd backend
pnpm test
```

### **SDK Tests**

```bash
cd sdk
pnpm test
```

---

## Side Notes & Gotchas

* **Program IDL:**
  After building, the generated IDL will be in `target/idl/solana_programs.json`.

* **Program ID:**
  The Solana program ID is fixed to a pre-generated keypair located at `solana-programs/target/deploy/solana_programs-keypair.json`.
  You don’t need to manually generate new ones unless you're deploying to devnet/mainnet.

* **Copyfile Disable on MacOS:**
  Always set `export COPYFILE_DISABLE=true` before running `solana-test-validator` to prevent `.DS_Store`/`._genesis.bin` issues.

* **Solana CLI Versioning:**
  Use the **Anza installer** as shown above to avoid inconsistent binary issues.

* **Anchor Versioning:**
  Ensure your `anchor-lang` version in Cargo.toml matches the Anchor CLI version.
  You might need to tweak `[features]` in Anchor.toml if the need arises
