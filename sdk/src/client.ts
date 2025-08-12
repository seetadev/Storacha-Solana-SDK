import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createDepositTxn } from './payment';

export enum Environment {
  mainnet = 'mainnet-beta',
  testnet = 'testnet',
  devnet = 'devnet',
}

export function getRpcUrl(env: Environment): string {
  switch (env) {
    case Environment.mainnet:
      return 'https://api.mainnet-beta.solana.com';
    case Environment.testnet:
      return 'https://api.testnet.solana.com';
    case Environment.devnet:
      return 'https://api.devnet.solana.com';
    default:
      throw new Error(`Unsupported environment: ${env}`);
  }
}


export interface ClientOptions {
  /** Solana RPC endpoint to use for chain interactions */
  environment: Environment;
}

export interface DepositParams {
  /** Wallet public key of the payer */
  payer: PublicKey;
  /** File to be stored */
  file: File;
  /** Duration in days to store the data */
  durationDays: number;
}

/**
 * Solana Storage Client — simplified (no fee estimation)
 */
export class Client {
  private rpcUrl: string;

  constructor(options: ClientOptions) {
    this.rpcUrl = getRpcUrl(options.environment);
  }

  /**
   * Creates a deposit transaction ready to be signed & sent by user's wallet.
   */
  async createDeposit({
    payer,
    file,
    durationDays,
  }: DepositParams): Promise<Transaction> {
    console.log('Creating deposit transaction with enviroment:', this.rpcUrl);
    const connection = new Connection(this.rpcUrl, 'confirmed');

    return await createDepositTxn({
      file,
      duration: durationDays * 86400,
      payer,
      connection,
    });
  }
}
