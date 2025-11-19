import { Connection, PublicKey } from '@solana/web3.js';
import { DAY_TIME_IN_SECONDS } from './constants';
import { fetchUserDepositHistory } from './depositHistory';
import { createDepositTxn } from './payment';
import { CreateDepositArgs, UploadResult } from './types';

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

export interface DepositParams
  extends Pick<CreateDepositArgs, 'signTransaction' | 'userEmail'> {
  /** Wallet public key of the payer */
  payer: PublicKey;
  /** File(s) to be stored */
  file: File[];
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
   *
   * @param {Object} params
   * @param {PublicKey} params.payer - The public key (wallet address) of the connected wallet.
   * @param {File} params.file - The file to be uploaded.
   * @param {number} params.durationDays - How long (in days) the file should be stored.
   * @param {(tx: Transaction) => Promise<Transaction>} params.signTransaction -
   *   A callback function to authorize the transaction via the Solana wallet library.
   *
   * @example
   * const { publicKey, signTransaction } = useSolanaWallet();
   * const result = await createDeposit({
   *   payer: publicKey,
   *   file,
   *   durationDays: 30,
   *   signTransaction,
   * });
   *
   * @returns {Promise<UploadResult>} The upload result after transaction is processed.
   */
  async createDeposit({
    payer,
    file,
    durationDays,
    signTransaction,
    userEmail,
  }: DepositParams): Promise<UploadResult> {
    console.log('Creating deposit transaction with environment:', this.rpcUrl);
    const connection = new Connection(this.rpcUrl, 'confirmed');

    return await createDepositTxn({
      file,
      duration: durationDays * DAY_TIME_IN_SECONDS,
      payer,
      connection,
      signTransaction,
      userEmail,
    });
  }

  /**
   * estimates the cost for a file based on the amount of days it should be stored for
   * @param {File} file - a file to be uploaded
   * @param {number} duration - how long (in seconds) the file should be stored for
   */
  estimateStorageCost = (file: File[], duration: number) => {
    const ratePerBytePerDay = 1000; // this would be obtained from the program config later
    const fileSizeInBytes = file.reduce((acc, f) => acc + f.size, 0);
    const totalLamports = fileSizeInBytes * duration * ratePerBytePerDay;
    const totalSOL = totalLamports / 1_000_000_000;

    return {
      sol: totalSOL,
      lamports: totalLamports,
    };
  };

  async getUserUploadHistory(userAddress: string) {
    const response = await fetchUserDepositHistory(userAddress);
    return response;
  }
}
