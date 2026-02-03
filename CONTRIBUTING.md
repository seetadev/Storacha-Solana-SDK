# Contributing to toju (keep)

Thanks for your interest in contributing to Toju! This guide will help you get set up for local development.

## Monorepo Structure

```
packages/
  ├── sol/            # Solana SDK (@toju.network/sol)
  ├── fil/            # Filecoin SDK (@toju.network/fil) - in development
  └── eth/            # Ethereum/Base SDK (@toju.network/eth) - planned
ui/                   # React frontend (Vite + Chakra UI)
solana-programs/      # Solana payment contract (Anchor framework)
server/               # Node.js backend (Express + Drizzle)
docs/                 # Mintlify documentation
```

## Prerequisites

- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://solana.com/docs/intro/installation) - **Use the Anza installer:**
  ```bash
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
  ```
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js >= 20](https://nodejs.org/en/) and [pnpm](https://pnpm.io/installation)
- [Storacha CLI](https://storacha.network) - `npm install -g @storacha/cli`

## Branch Strategy

- **`main`** - Production branch (deploys to mainnet)
- **`dev`** - Staging branch (deploys to testnet)

All feature branches should be created from and merged into `dev`. After testing on staging, changes are merged from `dev` → `main`.

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/seetadev/storacha-solana-sdk.git
cd storacha-solana-sdk
git checkout dev  # Work on the dev branch for staging/testnet
pnpm install
```

### 2. Installing Dependencies in Workspace Packages

This is a pnpm workspace monorepo. Use the `-F` (or `--filter`) flag to install in specific packages:

```bash
pnpm add <package-name> -F server         # server workspace
pnpm add <package-name> -F ui             # UI workspace
pnpm add <package-name> -F @toju.network/sol  # Solana SDK
pnpm add <package-name> -F @toju.network/fil  # Filecoin SDK
pnpm add -D <package-name> -F server      # dev dependencies
```

**Don't install at root** unless it's a shared dev tool (like TypeScript or ESLint).

## Solana Local Development

### 1. Start Local Validator

```bash
cd solana-programs

# macOS: remove old ledgers and prevent resource fork issues
rm -rf test-ledger
export COPYFILE_DISABLE=true

solana-test-validator
```

### 2. Build & Deploy the Program

In a new terminal:

```bash
cd solana-programs
anchor build
anchor deploy
```

### 3. Airdrop SOL

```bash
solana airdrop 2
```

If rate-limited, retry after a few seconds. Max is 5 SOL per request.

## Server Setup

### Database Setup

We use [Neon](https://neon.tech) for PostgreSQL. Each contributor should set up their own instance.

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project (e.g., `toju-local-dev`)
3. Copy your connection string from the dashboard

### Environment Variables

```bash
cd server
cp .env.example .env
./scripts/generate-admin-key.sh
```

Fill in your `.env`:
- `DATABASE_URL` - Neon connection string
- `RESEND_API_KEY` - Get from [resend.com](https://resend.com)
- `BTRSTACK_SOURCE_TOKEN` / `BTRSTACK_SOURCE_ID` - For Betterstack logging
- `ADMIN_KEYPAIR` - Output from generate-admin-key.sh
- `STORACHA_KEY` / `STORACHA_PROOF` - See Storacha setup below

### Storacha Setup

Generate `STORACHA_KEY` and `STORACHA_PROOF`:

```bash
# 1. Login to Storacha
storacha login

# 2. Create a space
storacha space create my-space-name

# 3. Generate server agent key
storacha key create
# Output: did:key:z6Mk... (server agent DID)
# Also outputs private key - save as STORACHA_KEY

# 4. Select your space
storacha space use did:key:z6Mk...  # your space DID

# 5. Create delegation with all capabilities
storacha delegation create did:key:z6Mk... \
  --can 'space/*' \
  --can 'blob/*' \
  --can 'index/*' \
  --can 'store/*' \
  --can 'upload/*' \
  --can 'access/*' \
  --can 'filecoin/*' \
  --can 'usage/*' \
  --base64
# Output: base64 string - save as STORACHA_PROOF
```

**Important:** All capabilities above are required:
- `store/*` and `upload/*` - file uploads
- `upload/*` - deleting expired files (`upload/remove`)
- `usage/*` - usage monitoring and reporting

**Finding your server agent DID from an existing key:**
```bash
cd server
node -e "import('@storacha/client/principal/ed25519').then(({Signer}) => console.log(Signer.parse('YOUR_STORACHA_KEY_VALUE').did()))"
```

### Database Migrations

```bash
cd server

# Generate migration files
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Seed config table
pnpm db:seed
```

### Run the Server

```bash
cd server
pnpm dev
```

## SDK Development

### Package Structure

Each blockchain integration has its own package in `packages/`:

- `packages/sol/` - Solana SDK (live on mainnet)
- `packages/fil/` - Filecoin SDK (in development)
- `packages/eth/` - Ethereum/Base SDK (planned)

Each package is independently versioned and published to npm.

### Build an SDK

```bash
# Build Solana SDK
cd packages/sol
pnpm build

# Build Filecoin SDK (when ready)
cd packages/fil
pnpm build
```

### Testing SDK Changes Locally

The UI is already configured to use the workspace SDK. Changes to the SDK are reflected after rebuilding:

```bash
cd packages/sol
pnpm build
```

The `ui/package.json` uses `"@toju.network/sol": "workspace:*"` which symlinks to the local SDK.

## UI Development

```bash
cd ui
pnpm dev
```

## Documentation

We use [Mintlify](https://mintlify.com) for docs.

### Run docs locally

```bash
pnpm docs:dev
```

Starts at `http://localhost:3000` with hot-reload.

### Adding pages

1. Create `.mdx` file in `docs/` (e.g., `docs/sdk/new-feature.mdx`)
2. Add frontmatter:
   ```mdx
   ---
   title: 'Your Page Title'
   description: 'Brief description'
   ---
   ```
3. Add to `docs/mint.json` navigation array

## Code Quality & Pre-Push Checks

Before pushing code, always run these commands to avoid breaking CI:

```bash
# Format all files
pnpm format

# Run linter with auto-fix
pnpm lint

# Run both format + lint
pnpm check

# Check if code passes CI (no auto-fix)
pnpm check:ci
```

**Important:** CI runs `pnpm check:ci` on every push. Make sure it passes locally first.

### Available Scripts

- `pnpm format` - Format code with Biome (auto-fix)
- `pnpm format:check` - Check formatting without fixing
- `pnpm lint` - Lint code with Biome (auto-fix)
- `pnpm lint:check` - Check linting without fixing
- `pnpm check` - Run format + lint with auto-fix
- `pnpm check:ci` - Run CI checks (used by GitHub Actions)

## Commit Message Guidelines

Use conventional commits for automatic changelog generation:

```bash
feat: add new feature
fix: resolve bug
chore: update dependencies
feat(sol): add transaction retry logic
fix(fil): resolve USDFC decimals issue
```

See [VERSIONING.md](./VERSIONING.md) for commit message format.

## Notes

- **Program IDL:** Generated at `target/idl/solana_programs.json` after build
- **Program ID:** Pre-generated at `solana-programs/target/deploy/solana_programs-keypair.json`
- **macOS:** Always set `export COPYFILE_DISABLE=true` before `solana-test-validator`
- **Anchor versioning:** Ensure `anchor-lang` in Cargo.toml matches your Anchor CLI version

## Testing the App

1. Install [Phantom wallet](https://phantom.app/) browser extension
2. Enable testnet in Settings > Developer Settings
3. Get test SOL from [Solana Faucet](https://faucet.solana.com/)
4. Try the app in prod (where you'll need real SOL) [here](https://toju.network) and on (staging](https://staging.toju.network) where you can use testnet SOL.
