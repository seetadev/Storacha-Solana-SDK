# @toju.network/x402

## 0.1.0

### Minor Changes

- df76d21: initial release of `@toju.network/x402` — agent-friendly client for autonomous storage payments via the x402 protocol.

  `AgentClient` wraps the x402 fetch flow so agents can store files on ipfs paying with USDC on Base with no human intervention. includes `store(file, { durationDays })` and `estimateStorageCost(sizeInBytes, durationDays)`. supports both `mainnet` and `sepolia` environments.
