# Storacha Onchain Payments (Solana)

**Storacha Onchain Payments** is a **per-upload, pay-as-you-go decentralized storage payments on Solana**.
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
ui/               # Our user interface for you to upload data to IPFS without using the SDK
solana-programs/  # Solana payment contract (Anchor framework)
server/           # Node.js server for communicating with the contract
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

#### **Installing Dependencies in Workspace Packages**

This is a pnpm workspace monorepo. To install dependencies in a specific workspace package (server, ui, sdk, docs), use the `-F` (or `--filter`) flag:

```bash
# Install in server workspace
pnpm add <package-name> -F server

# Install in UI workspace
pnpm add <package-name> -F ui

# Install in SDK workspace
pnpm add <package-name> -F sdk

# Install dev dependencies
pnpm add -D <package-name> -F server

# Examples:
pnpm add @sentry/node -F server
pnpm add react-query -F ui
```

**Don't install at root** unless it's a shared dev tool (like TypeScript or ESLint).

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

### **6. Server**

```bash
cd server
pnpm dev
```

### **7. SDK**

```bash
cd sdk
pnpm build
```

### Working on the SDK and testing

Go into the `ui/` directory, update the `storacha-sol` dependency version to this: `"workspace:*"`, this is so that we can benefit from pnpm's workspace protocol that'll allow you see changes you make after building the sdk successfully. 

When you're done with that, go back to the root of the project and do: 

```bash
pnpm install
```
So we get a symlink of the built package.


## **Database Migration Workflow**

1. **Navigate to the server directory**

   ```bash
   cd server
   ```

2. **Generate migration files**
   Creates a migration script based on the differences between the current database schema and your updated schema definitions.

   ```bash
   pnpm db:generate
   ```

3. **Apply migrations to the database**
   Runs the generated migration scripts to update the database schema.

   ```bash
   pnpm db:migrate
   ```

---

### Environment Variables

To set up the server environment:

```bash
cd server
cp .env.example .env

./scripts/generate-admin-key.sh
```

Then fill in your values in `.env` for Resend API key, database credentials, Storacha keys, and paste the admin keypair from the script output. Get your Resend API key at [resend.com](https://resend.com). For logging, set `BTRSTACK_SOURCE_TOKEN` and `BTRSTACK_SOURCE_ID` to send structured logs to Betterstack.

## Testing and actually using the program

Install a Solana wallet like Phantom wallet in your browser. Go your settings and click on "Developer Settings".

Toggle the testnet option, and then go to [Solana Faucet](https://faucet.solana.com/) to airdrop SOL into your wallet. You'll need to copy your testnet address for this.

You can test everything out on the playground [here](https://storacha-sol.vercel.app/)

## Contributing to Documentation

We use [Mintlify](https://mintlify.com) for our documentation. To contribute:

### Run docs dev server

```bash
pnpm docs:dev
```

This starts the docs server at `http://localhost:3000` with hot-reload for any changes to `.mdx` files.

If you don't have the `mintlify` CLI installed, you'll be prompted to install it. Please do so.

### Adding new pages

1. Create a new `.mdx` file in the `docs/` directory (e.g., `docs/sdk/new-feature.mdx`)
2. Add frontmatter at the top:
   ```mdx
   ---
   title: 'Your Page Title'
   description: 'Brief description'
   ---
   ```
3. Add the page to `docs/mint.json` navigation array
4. Write your content using MDX (Markdown + React components)

See existing docs in `docs/sdk/` for examples and patterns.

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
