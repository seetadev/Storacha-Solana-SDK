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
- **Extensible** – Designed for multi-chain support (Phase 2).


## Monorepo Structure

storacha-payments/
├── program/ # Solana payment contract (Anchor framework)
├── backend/ # Node.js backend API with UCAN storage delegation
├── sdk/ # TypeScript SDK (@storacha/sol-sdk)



## Quick Start

### **1. Prerequisites**
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli)
- [Anchor Framework](https://book.anchor-lang.com/chapter_2/installation.html)
- [Node.js >= 20](https://nodejs.org/en/) and [pnpm](https://pnpm.io/installation)
- (Optional) [Docker](https://www.docker.com/) for test validators


### 2. Setup

Clone the repository:

git clone https://github.com/seetadev/storacha-solana-sdk.git

cd storacha-solana-sdk

pnpm install


Build all components:

pnpm build


### 3. Running Locally

Solana Program

cd program

solana-test-validator

anchor build

anchor deploy


### 4. Backend Server

cd backend

pnpm dev


### 5. SDK

cd sdk

pnpm build


## Testing

### Anchor Program Tests:

cd program

anchor test

### Backend Tests

cd backend

pnpm test


### SDk Tests

cd sdk

pnpm test







