# Storacha Onchain Payments (Solana)

**Storacha Onchain Payments** is a proof-of-concept system enabling **per-upload, pay-as-you-go decentralized storage payments on Solana**.
Users pay with **native SOL**, while a fiat-subscribed reseller account underwrites the storage service.
This monorepo contains the **Solana Payment Program**, **Backend API**, and **TypeScript SDK**.

## Features

- **Onchain Payments** – Pay storage fees directly with SOL.
- **No Credit Cards** – Pure crypto-native flow.
- **Escrow-based Rewards** – Funds released linearly per block to service providers.
- **Backend API with UCAN Delegation** – Secure storage delegation via UCAN tokens.
- **TypeScript SDK** – Easily integrate with dapps (supports Solana Mobile dapp publishing).
- **Upload History** – Track all your uploads with detailed metadata (file name, size, expiration, status).
- **Email Notifications** – Get warned 7 days before your files expire (powered by Resend).
- **Automatic Cleanup** – Expired files are automatically deleted from Storacha storage.
- **Extensible** – Designed for multi-chain support (Phase 2).

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

  - **IMPORTANT:** Install using the Anza installer to avoid SSL/archive issues:

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

## **Backend Database Migration Workflow**

1. **Navigate to the Backend directory**

   ```bash
   cd Backend
   ```

2. **Generate migration files**
   Creates a migration script based on the differences between the current database schema and your updated schema definitions.

   ```bash
   pnpm migrations-generate
   ```

3. **Apply migrations to the database**
   Runs the generated migration scripts to update the database schema.

   ```bash
   pnpm migrations-apply
   ```

---

### Environment Variables

To set up your backend environment:

```bash
cd Backend
cp .env.example .env
```

Then fill in your values for Resend API key, database credentials, and Storacha keys. Get your Resend API key at [resend.com](https://resend.com).

## Testing and actually using the program

Install a Solana wallet like Phantom wallet in your browser. Go your settings and click on "Developer Settings".

Toggle the testnet option, and then go to [Solana Faucet](https://faucet.solana.com/) to airdrop SOL into your wallet. You'll need to copy your testnet address for this.

When you're done, clone this [sample repo](https://github.com/kaf-lamed-beyt/sto-sol) to basically test that you can make a deposit. The backend server has to be running locally for this to work. Please ensure that is right.

You can also test everything out on the playground [here](https://storacha-sol.vercel.app/)

## Side Notes

- **Program IDL:**
  After building, the generated IDL will be in `target/idl/solana_programs.json`.

- **Program ID:**
  The Solana program ID is fixed to a pre-generated keypair located at `solana-programs/target/deploy/solana_programs-keypair.json`.
  You don’t need to manually generate new ones unless you're deploying to devnet/mainnet.

- **Copyfile Disable on MacOS:**
  Always set `export COPYFILE_DISABLE=true` before running `solana-test-validator` to prevent `.DS_Store`/`._genesis.bin` issues.

- **Solana CLI Versioning:**
  Use the **Anza installer** as shown above to avoid inconsistent binary issues.

- **Anchor Versioning:**
  Ensure your `anchor-lang` version in Cargo.toml matches the Anchor CLI version.
  You might need to tweak `[features]` in Anchor.toml if the need arises
