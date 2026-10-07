# toju: Agentic Infrastructure, Observability & Portable Storage

**toju** provides enterprise infrastructure for AI agents with **portable storage, content-addressed data, verifiable observability, and machine-to-machine payments**.

Built on **IPFS, Storacha, and Solana Pay**, toju enables agents and enterprise applications to securely store, retrieve, verify, and exchange data and execution artifacts across clouds, storage providers, and infrastructure platforms—without being locked into a single vendor.

Content addressing gives enterprise agents **portable, verifiable, and tamper-evident identities** for data, state, telemetry, receipts, and execution artifacts. Combined with **Solana Pay**, these records can be linked to machine-to-machine payments, enabling verifiable agent commerce, auditable transactions, and vendor-neutral infrastructure.

## Core Ideas

### 🤖 Agentic Infrastructure

toju provides infrastructure for AI agents that need to operate across organizational, cloud, and network boundaries.

* Portable agent data and state
* Content-addressed execution artifacts
* Verifiable agent outputs and receipts
* Agent-to-service and machine-to-machine workflows
* Infrastructure designed for decentralized and interoperable agent networks
* Pay-as-you-go infrastructure without traditional subscriptions

### 🔗 Content-Addressed Enterprise Data

IPFS content addressing makes data independently verifiable and portable.

Use content-addressed identifiers for:

* Agent state and memory
* Data and documents
* Model and tool artifacts
* Execution results
* Telemetry and observability records
* Payment receipts
* Audit records
* Workflow and transaction artifacts

The same artifact can be referenced and verified across **clouds, storage providers, applications, and observability platforms**.

### 📊 Portable Observability

Enterprise agents need more than conventional logs. Their actions, decisions, tool calls, execution artifacts, and transactions need to be **portable and independently verifiable**.

toju enables content-addressed observability records that can move across:

* Observability platforms
* Cloud providers
* Agent runtimes
* Enterprise systems
* Storage networks

This creates a foundation for **auditable and vendor-neutral agent operations**.

### 💾 Portable & Decentralized Storage

toju provides pay-as-you-go decentralized storage through **IPFS and Storacha**, with Filecoin-backed persistence.

Applications can store content without coupling their data lifecycle to a single centralized storage provider.

* Content-addressed storage
* Filecoin-backed persistence
* Portable CIDs
* Pay-as-you-go storage
* Storage lifecycle management
* Automatic expiration and cleanup
* Expiration notifications

### 💸 Solana Pay & Agent Commerce

**Solana Pay** connects portable data and infrastructure with machine-to-machine payments.

Agents and applications can:

* Pay for storage
* Pay for infrastructure services
* Exchange value programmatically
* Link payments to content-addressed receipts
* Automate settlement
* Build verifiable agent-to-agent commerce

This creates a simple flow:

**Agent → Service → Content → Receipt → Payment → Verification**

toju also supports **x402-based agentic payments**, enabling AI agents to autonomously pay for infrastructure and services.

---

## Why Content Addressing Matters for Agents

Enterprise agents increasingly operate across multiple clouds, runtimes, storage systems, and service providers.

A conventional URL or vendor-specific identifier ties an artifact to a particular infrastructure provider. A content identifier instead identifies the **content itself**.

This allows an agent to carry verifiable references to:

```text
Data
  ↓
CID
  ↓
Agent State / Execution Artifact
  ↓
Telemetry / Receipt
  ↓
Payment
  ↓
Verification
```

The result is **portable infrastructure for autonomous systems**.

An agent can move between environments while retaining verifiable references to the data, state, actions, and transactions associated with its work.

---

## Features

* **Content-addressed storage** using IPFS
* **Filecoin-backed persistence** through Storacha
* **Native SOL payments** through Solana Pay
* **USDC and USDFC support**
* **Pay-as-you-go infrastructure**
* **Agentic payments** through x402
* **Portable data and execution artifacts**
* **Verifiable receipts and transaction records**
* **Storage lifecycle management**
* **Automatic cleanup of expired content**
* **Email notifications before storage expiration**
* **Developer-friendly SDK and CLI**
* **Designed for enterprise and agentic applications**

---

## Quick Start

### Install the SDK

```bash
npm install @toju.network/sol
```

### Direct Usage — Node.js / Server-side

```typescript
import { Client, Environment } from '@toju.network/sol';

const client = new Client({
  environment: Environment.testnet,
});

// Estimate storage cost
const cost = await client.estimateStorageCost(
  [file],
  30 * 86400
);

console.log(`Cost: ${cost.sol} SOL`);

// Upload and create a storage deposit
const result = await client.createDeposit({
  payer: publicKey,
  file: [file],
  durationDays: 30,
  signTransaction,
  userEmail: 'user@example.com',
});

console.log(`Content CID: ${result.cid}`);
```

### React

```typescript
import { useDeposit } from '@toju.network/sol';
import { useWallet } from '@solana/wallet-adapter-react';

function UploadComponent() {
  const { publicKey, signTransaction } = useWallet();
  const client = useDeposit('mainnet-beta', false);

  const handleUpload = async (files: File[]) => {
    const cost = await client.estimateStorageCost(
      files,
      30 * 86400
    );

    const result = await client.createDeposit({
      payer: publicKey,
      file: files,
      durationDays: 30,
      signTransaction,
    });

    console.log(`Uploaded: ${result.cid}`);
    console.log('Cost:', cost);
  };

  return (
    <button onClick={() => handleUpload([file])}>
      Upload
    </button>
  );
}
```

---

## Enterprise Agent Architecture

toju is designed as infrastructure underneath agentic applications:

```text
┌─────────────────────────────────────────┐
│           Enterprise AI Agents          │
├─────────────────────────────────────────┤
│   Agent Runtime • Tools • Workflows     │
├─────────────────────────────────────────┤
│ Identity • State • Telemetry • Receipts │
├─────────────────────────────────────────┤
│          Content Addressing             │
├─────────────────────────────────────────┤
│       IPFS • Storacha • Filecoin        │
├─────────────────────────────────────────┤
│        Solana Pay • x402 Payments       │
└─────────────────────────────────────────┘
```

The goal is to make agent infrastructure **portable, verifiable, observable, and economically programmable**.

---

## Use Cases

### Enterprise AI

Store agent memory, execution artifacts, reports, and audit records independently of a single cloud provider.

### Agentic Commerce

Enable agents to autonomously purchase storage, data, compute, and other services using machine-to-machine payments.

### Verifiable Observability

Create portable, content-addressed records of agent actions, telemetry, execution results, and receipts.

### Multi-Cloud Infrastructure

Move data and agent workloads across infrastructure providers without losing verifiable references to underlying artifacts.

### Decentralized Applications

Build applications where storage, identity, data, execution artifacts, and payments are independently verifiable.

---

## Web App

**Production (Mainnet):**
https://toju.network

**Staging (Testnet):**
https://staging.toju.network

## Documentation

https://docs.toju.network

## Resources

* **API:** https://api.toju.network/health
* **Mainnet Demo:** https://youtu.be/VqD2NWYqPDE
* **Staging API:** https://staging-api.toju.network/health
* **GitHub:** https://github.com/tojunetwork/afara
* **NPM:** https://www.npmjs.com/package/@toju.network/sol
* **Discord:** https://discord.gg/j6YEHyCV

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

Apache-2.0
