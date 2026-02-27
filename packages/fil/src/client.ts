import { JsonRpcProvider } from 'ethers'
import {
  DAY_TIME_IN_SECONDS,
  FILECOIN_RPC,
  getEndpointForRpc,
} from './constants'
import {
  createDepositTxn,
  getStorageRenewalCost,
  renewStorageTxn,
} from './payment'
import {
  CreateDepositArgs,
  StorageCostEstimate,
  StorageRenewalCost,
  StorageRenewalParams,
  UploadHistoryResponse,
  UploadResult,
} from './types'

export enum Environment {
  mainnet = 'mainnet',
  calibration = 'calibration',
}

export function getRpcUrl(env: Environment): string {
  switch (env) {
    case Environment.mainnet:
      return FILECOIN_RPC.mainnet
    case Environment.calibration:
      return FILECOIN_RPC.calibration
    default:
      throw new Error(`Unsupported environment: ${env}`)
  }
}

export interface ClientOptions {
  /** Filecoin RPC environment */
  environment: Environment
  /** Optional custom RPC override */
  rpcUrl?: string
  /** Optional backend API endpoint */
  endpoint?: string
}

export interface UploadParams
  extends Pick<CreateDepositArgs, 'sendTransaction' | 'userEmail'> {
  /** User's wallet address */
  userAddress: string
  /** File(s) to be stored */
  file: File[]
  /** Duration in days to store the data */
  durationDays: number
}

/**
 * Filecoin Storage Client
 */
export class Client {
  private rpcUrl: string
  private apiEndpoint: string
  public provider: JsonRpcProvider

  constructor(options: ClientOptions) {
    this.rpcUrl = options.rpcUrl || getRpcUrl(options.environment)
    this.apiEndpoint = options.endpoint || getEndpointForRpc(this.rpcUrl)
    this.provider = new JsonRpcProvider(this.rpcUrl)
  }

  /**
   * Creates a deposit by uploading files and paying with USDFC
   *
   * @param {Object} params
   * @param {string} params.userAddress - User's wallet address
   * @param {File[]} params.file - File(s) to upload
   * @param {number} params.durationDays - Storage duration in days
   * @param {Function} params.sendTransaction - Callback to send USDFC transfer
   * @param {string} [params.userEmail] - Optional email for notifications
   *
   * @example
   * const { address, sendTransaction } = useEthersWallet();
   * const result = await client.createDeposit({
   *   userAddress: address,
   *   file: [file],
   *   durationDays: 30,
   *   sendTransaction: async (txData) => {
   *     // Send USDFC transfer and return tx hash
   *     return txHash;
   *   },
   * });
   *
   * @returns {Promise<UploadResult>} Upload result with transaction details
   */
  async createDeposit({
    userAddress,
    file,
    durationDays,
    sendTransaction,
    userEmail,
  }: UploadParams): Promise<UploadResult> {
    console.log('Creating USDFC deposit with environment:', this.rpcUrl)

    return await createDepositTxn(
      {
        file,
        duration: durationDays * DAY_TIME_IN_SECONDS,
        userAddress,
        sendTransaction,
        userEmail,
      },
      this.apiEndpoint,
    )
  }

  /**
   * Estimates storage cost for files
   *
   * @param {File[]} file - File(s) to estimate cost for
   * @param {number} duration - Storage duration in days
   *
   * @example
   * const cost = await client.estimateStorageCost([file], 30);
   * console.log(`Cost: ${cost.usdfc} USDFC`);
   *
   * @returns {Promise<StorageCostEstimate>} Cost estimate in USDFC
   */
  async estimateStorageCost(
    file: File[],
    duration: number,
  ): Promise<StorageCostEstimate> {
    const fileSizeInBytes = file.reduce((acc, f) => acc + f.size, 0)

    const response = await fetch(
      `${this.apiEndpoint}/pricing/quote?size=${fileSizeInBytes}&duration=${duration}&chain=fil`,
    )

    if (!response.ok) throw new Error('Failed to get storage cost estimate')

    const { quote } = await response.json()
    const totalUSD = quote.totalCost

    return {
      usdfc: totalUSD.toFixed(6), // USDFC is 1:1 with USD, 6 decimals
      usd: totalUSD.toFixed(2),
    }
  }

  /**
   * Gets upload history for a user
   *
   * @param {string} userAddress - User's wallet address
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Number of results per page
   *
   * @example
   * const history = await client.getUserUploadHistory(address, 1, 10);
   *
   * @returns {Promise<UploadHistoryResponse>} Paginated upload history
   */
  async getUserUploadHistory(
    userAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<UploadHistoryResponse> {
    const response = await fetch(
      `${this.apiEndpoint}/upload/history?userAddress=${userAddress}&page=${page}&limit=${limit}&chain=fil`,
    )

    if (!response.ok) throw new Error('Failed to fetch upload history')

    return await response.json()
  }

  /**
   * Get the cost of renewing storage for an existing upload
   *
   * @param {string} cid - Content identifier of the file to renew
   * @param {number} duration - Number of additional days to extend storage
   *
   * @example
   * const cost = await client.getStorageRenewalCost('bafybeig...', 30);
   * console.log(`Renewal: ${cost.costInUsdfc} USDFC`);
   *
   * @returns {Promise<StorageRenewalCost>} Cost breakdown and expiration details
   */
  async getStorageRenewalCost(
    cid: string,
    duration: number,
  ): Promise<StorageRenewalCost> {
    return await getStorageRenewalCost(cid, duration, this.apiEndpoint)
  }

  /**
   * Renew storage for an existing upload by paying with USDFC
   *
   * @param {Object} params
   * @param {string} params.cid - Content identifier of the file to renew
   * @param {number} params.duration - Number of additional days to extend storage
   * @param {string} params.userAddress - User's Filecoin wallet address
   * @param {Function} params.sendTransaction - Callback to send USDFC transfer
   *
   * @example
   * const result = await client.renewStorageDuration({
   *   cid: 'bafybeig...',
   *   duration: 30,
   *   userAddress: address,
   *   sendTransaction: async (txData) => {
   *     return await writeContractAsync({ ... });
   *   },
   * });
   *
   * @returns {Promise<{ verified: boolean; message: string; deposit: unknown }>} Renewal result
   */
  async renewStorageDuration(
    params: StorageRenewalParams,
  ): Promise<{ verified: boolean; message: string; deposit: unknown }> {
    return await renewStorageTxn(params, this.apiEndpoint)
  }
}
