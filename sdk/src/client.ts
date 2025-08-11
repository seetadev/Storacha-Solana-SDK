import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createDepositTxn } from './payment';

export interface ClientOptions {
  /** Solana RPC endpoint to use for chain interactions */
  rpcUrl: string;
  /** Server URL for backend API calls */
  serverUrl: string;
}

export interface DepositParams {
  /** Wallet public key of the payer */
  payer: PublicKey;
  /** Content Identifier (CID) of the file */
  cid: string;
  /** File size in bytes */
  size: number;
  /** Duration in days to store the data */
  durationDays: number;
  /** Deposit amount in SOL */
  depositAmount: number;
}

/**
 * Solana Storage Client — simplified (no fee estimation)
 */
export class Client {
  private rpcUrl: string;
  private serverUrl: string;

  constructor(options: ClientOptions) {
    this.rpcUrl =
      options.rpcUrl; // Default RPC
    this.serverUrl =
      options.serverUrl; // Default API
  }

  /**
   * Creates a deposit transaction ready to be signed & sent by user's wallet.
   */
  async createDeposit({
    payer,
    cid,
    size,
    durationDays,
    depositAmount,
  }: DepositParams): Promise<Transaction> {
    const connection = new Connection(this.rpcUrl, 'confirmed');

    return await createDepositTxn({
      cid,
      size,
      duration: durationDays,
      payer,
      connection,
      depositAmount,
      apiUrl: `${this.serverUrl}/api/solana/deposit`,
    });
  }
}
