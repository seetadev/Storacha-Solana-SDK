import { Connection, PublicKey } from '@solana/web3.js'
import {
  DAY_TIME_IN_SECONDS,
  getEndpointForRpc,
  ONE_BILLION_LAMPORTS,
} from './constants'
import {
  createDepositTxn,
  getStorageRenewalCost,
  renewStorageTxn,
} from './payment'
import {
  CreateDepositArgs,
  StorageRenewalCost,
  StorageRenewalParams,
  UploadResult,
} from './types'
import { getUserUploadHistory } from './upload-history'

export enum Environment {
  mainnet = 'mainnet-beta',
  testnet = 'testnet',
  devnet = 'devnet',
  local = 'localnet',
}

export function getRpcUrl(env: Environment): string {
  switch (env) {
    case Environment.mainnet:
      return 'https://api.mainnet-beta.solana.com'
    case Environment.testnet:
      return 'https://api.testnet.solana.com'
    case Environment.devnet:
      return 'https://api.devnet.solana.com'
    case Environment.local:
      return 'http://localhost:5040'
    default:
      throw new Error(`Unsupported environment: ${env}`)
  }
}

export interface ClientOptions {
  /** Solana RPC endpoint to use for chain interactions */
  environment: Environment
  /** Optional custom RPC URL (overrides default public RPC) */
  rpcUrl?: string
  /** Optional custom API endpoint (useful for local development) you may never need this */
  endpoint?: string
}

export interface UploadParams
  extends Pick<CreateDepositArgs, 'signTransaction' | 'userEmail'> {
  /** Wallet public key of the payer */
  payer: PublicKey
  /** File(s) to be stored */
  file: File[]
  /** Duration in days to store the data */
  durationDays: number
}

/**
 * @deprecated Use {@link UploadParams} instead.
 */
export type DepositParams = UploadParams

/**
 * Solana Storage Client — simplified (no fee estimation)
 */
export class Client {
  private rpcUrl: string
  private apiEndpoint: string

  constructor(options: ClientOptions) {
    this.rpcUrl = options.rpcUrl || getRpcUrl(options.environment)
    this.apiEndpoint = options.endpoint || getEndpointForRpc(this.rpcUrl)
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
  }: UploadParams): Promise<UploadResult> {
    console.log('Creating deposit transaction with environment:', this.rpcUrl)
    const connection = new Connection(this.rpcUrl, 'confirmed')

    return await createDepositTxn(
      {
        file,
        duration: durationDays * DAY_TIME_IN_SECONDS,
        payer,
        connection,
        signTransaction,
        userEmail,
      },
      this.apiEndpoint,
    )
  }

  /**
   * estimates the cost for a file based on the amount of days it should be stored for
   * @param {File} file - a file to be uploaded
   * @param {number} duration - how long (in seconds) the file should be stored for
   */
  async estimateStorageCost(file: File[], duration: number) {
    const fileSizeInBytes = file.reduce((acc, f) => acc + f.size, 0)
    const durationInDays = Math.floor(duration / 86400) // convert seconds to day

    const response = await fetch(
      `${this.apiEndpoint}/pricing/quote?size=${fileSizeInBytes}&duration=${durationInDays}`,
    )

    if (!response.ok) throw new Error('Failed to get storage cost estimate')

    const { quote } = await response.json()
    const totalLamports = quote.totalCost
    const totalSOL = totalLamports / ONE_BILLION_LAMPORTS

    return {
      sol: totalSOL,
      lamports: totalLamports,
    }
  }

  async getUserUploadHistory(userAddress: string, page: number, limit: number) {
    const response = await getUserUploadHistory(userAddress, this.apiEndpoint, {
      page,
      limit,
    })
    return response
  }

  /**
   * Get cost estimate for renewing storage duration
   *
   * @param {string} cid - Content identifier of the file to renew
   * @param {number} duration - Number of additional days to extend storage
   *
   * @example
   * const quote = await client.getRenewalQuote('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', 30);
   * console.log(`Renewal cost: ${quote.costInSOL} SOL`);
   *
   * @returns {Promise<StorageRenewalCost | null>} Cost breakdown and expiration details
   */
  async getStorageRenewalCost(
    cid: string,
    duration: number,
  ): Promise<StorageRenewalCost | null> {
    return await getStorageRenewalCost(cid, duration, this.apiEndpoint)
  }

  /**
   * Renew storage for an existing deposit
   *
   * @param {Object} params
   * @param {string} params.cid - Content identifier of the file to renew
   * @param {number} params.duration - Number of additional days to extend storage
   * @param {PublicKey} params.payer - Wallet public key paying for the renewal
   * @param {(tx: Transaction) => Promise<Transaction>} params.signTransaction - Transaction signing callback
   *
   * @example
   * const { publicKey, signTransaction } = useSolanaWallet();
   * const result = await client.renewStorage({
   *   cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
   *   duration: 30,
   *   payer: publicKey,
   *   signTransaction,
   * });
   *
   * @returns {Promise<UploadResult>} Result of the renewal transaction
   */
  async renewStorageDuration({
    cid,
    duration,
    payer,
    signTransaction,
  }: StorageRenewalParams): Promise<UploadResult> {
    const connection = new Connection(this.rpcUrl, 'confirmed')

    return await renewStorageTxn(
      {
        cid,
        duration,
        payer,
        connection,
        signTransaction,
      },
      this.apiEndpoint,
    )
  }

  /**
   * Gets the current SOL/USD price
   *
   * @example
   * const { price } = await client.getSolPrice();
   * console.log(`SOL price: $${price}`);
   *
   * @returns {Promise<{ price: number }>} Current SOL price in USD
   */
  async getSolPrice(): Promise<number> {
    const request = await fetch(`${this.apiEndpoint}/pricing/sol`)
    if (!request.ok) throw new Error("Couldn't fetch SOL price")
    const data = await request.json()
    return data.price
  }
}
