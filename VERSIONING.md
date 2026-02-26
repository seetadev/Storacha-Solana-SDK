# Versioning Strategy

We use [changesets](https://github.com/changesets/changesets) for independent versioning and publishing of each package in the monorepo.

Previously we used [standard-version](https://github.com/conventional-changelog/standard-version), but it's designed for single-package repos. It couldn't scope version bumps or changelogs to individual packages in a monorepo — every release was global. Changesets solves this by letting each package track its own changes independently.

## Package Structure

```
packages/
  ├── sol/          # @toju.network/sol - Solana payments
  ├── fil/          # @toju.network/fil - Filecoin payments
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

## Workflow

There are three commands involved in the release process. Contributors only need to know the first one.

### 1. Add a changeset (contributors)

After making changes to a package, run:

```bash
pnpm changeset
```

This prompts you to:
- Select which packages changed (`@toju.network/sol`, `@toju.network/fil`, etc.)
- Choose the bump type (patch, minor, major)
- Write a summary of the change

A markdown file is created in `.changeset/` describing the change. **Commit this file alongside your code changes.** No versions are bumped at this stage — the changeset is just a record of intent.

**NOTE: the steps (2 & 3) below are reserved for maintainers**

### 2. Version packages

When ready to cut a release, a maintainer runs:

```bash
pnpm version-packages
```

This consumes all pending changeset files and:
- Bumps the `version` in each affected `package.json`
- Updates each package's `CHANGELOG.md`
- Removes the consumed changeset files from `.changeset/`

The result is a commit with updated versions and changelogs, ready to publish.

### 3. Publish to npm

```bash
pnpm release
```

This publishes every package that has a new version not yet on the npm registry. Requires npm authentication (`npm login` or `NPM_TOKEN` in CI).

## Commit Message Guidelines

Use conventional commits for clear history:

**Format:**
```
<type>: <description in lowercase>
```

**Types:**
- `feat:` - new features
- `fix:` - bug fixes
- `chore:` - maintenance, no user-facing changes
- `docs:` - documentation updates

**Scoped commits** for package-specific changes:
```
feat(sol): add transaction retry logic
fix(fil): resolve USDFC decimals issue
```

## Version Bumps

Changesets use semver:

- **patch** (0.1.0 → 0.1.1): bug fixes, internal changes
- **minor** (0.1.0 → 0.2.0): new features, non-breaking additions
- **major** (0.1.0 → 1.0.0): breaking changes

## Example

```bash
# 1. make changes to @toju.network/sol
# 2. add a changeset
pnpm changeset
# → select @toju.network/sol, pick "patch", write "fix deposit confirmation timeout"

# 3. commit everything (changeset file included)
git add --all
git commit -m "fix(sol): deposit confirmation timeout"

# 4. release
pnpm version-packages
git add --all
git commit -m "chore: version packages"
git push

# 5. publish to npm
pnpm release
```
