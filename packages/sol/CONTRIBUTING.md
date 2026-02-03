# Contributing to @toju.network/sol SDK

## Setup

1. Clone the repo and install dependencies from the root:

```bash
git clone https://github.com/seetadev/storacha-solana-sdk.git
cd storacha-solana-sdk
pnpm install
```

2. Navigate to the SDK directory:

```bash
cd sdk
```

## Development

### Building

```bash
pnpm build
```

### Testing Changes Locally

The monorepo uses pnpm workspaces. The UI (`ui/`) is configured to use `"@toju.network/sol": "workspace:*"`, which symlinks to the local SDK.

To test your changes:

1. Build the SDK:
   ```bash
   cd sdk
   pnpm build
   ```

2. Run the UI:
   ```bash
   cd ../ui
   pnpm dev
   ```

Your SDK changes will be reflected immediately after rebuilding.

### Code Style

- Use TypeScript
- Follow existing patterns in the codebase
- Keep functions focused and well-documented

## Submitting Changes

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `pnpm build` to ensure it compiles
5. Test your changes using the UI
6. Open a PR with a clear description

## Questions?

Open an issue or reach out on [GitHub Discussions](https://github.com/seetadev/Storacha-Solana-SDK/discussions).
