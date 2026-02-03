# Versioning Strategy

We use independent versioning for each package in the monorepo. Each package maintains its own version number and changelog using [standard-version](https://github.com/conventional-changelog/standard-version).

## Package Structure

```
packages/
  ├── sol/          # @toju.network/sol - Solana payments (v0.1.1)
  ├── fil/          # @toju.network/fil - Filecoin payments (not yet published)
  └── eth/          # @toju.network/eth - Ethereum/Base payments (planned)
```

Each package has:
- Independent `package.json` with its own version
- Independent `CHANGELOG.md` tracking changes
- Independent release cycle

## Why Independent Versioning?

Different blockchain integrations evolve at different rates:

- **Solana package** may receive bug fixes while others are stable
- **Filecoin package** might add features without affecting Solana users
- **Ethereum package** could be in development while others are production-ready

Independent versioning means:
- Users only see relevant updates for their chain
- Breaking changes in one package don't force version bumps in others
- Each package can follow its own maturity timeline

## Changelog Format

Each package uses standard-version for automatic changelog generation. See [`packages/sol/CHANGELOG.md`](packages/sol/CHANGELOG.md) for the format.

Changelogs are generated from conventional commit messages:

```bash
feat: add new feature
fix: resolve bug
chore: update dependencies
```

## Commit Message Guidelines

Use conventional commits for automatic changelog generation:

**Format:**
```
<type>: <description in lowercase>
```

**Types:**
- `feat:` - new features (minor version bump)
- `fix:` - bug fixes (patch version bump)
- `chore:` - maintenance, no user-facing changes
- `docs:` - documentation updates

**Scoped commits** for package-specific changes:
```
feat(sol): add transaction retry logic
fix(fil): resolve USDFC decimals issue
```

**Examples:**
```
feat: add storage renewal endpoints
fix(sol): return user friendly error on duplicate upload
chore: update dependencies
docs: add usage examples to README
```

## Version Bumps

standard-version automatically determines version bumps based on commits:

- `feat:` → minor version (0.1.0 → 0.2.0)
- `fix:` → patch version (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → major version (0.1.0 → 1.0.0)

Breaking changes require a footer:
```
feat: redesign storage API

BREAKING CHANGE: removed deprecated createDeposit() method, use createPayment() instead
```
