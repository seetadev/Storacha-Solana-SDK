// TODO: Solana-specific imports removed.
// We will reuse similar abstractions for Filecoin.
import {
  DAY_TIME_IN_SECONDS,
  getEndpointForRpc,
} from './constants'

// TODO: These payment helpers are currently Solana-based.
// Reuse the same function signatures for Filecoin transactions.
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

/**
 * TODO:
 * Replace Solana environments with Filecoin networks
 * (e.g. calibration, mainnet, local lotus)
 */
export enum Environment {
  mainnet = 'mainnet',
  testnet = 'testnet',
  devnet = 'devnet',
  local = 'local',
}

/**
 * TODO:
 * Replace Solana RPC resolution with Filecoin/Lotus endpoint logic
 */
export function getRpcUrl(env: Environment): string {
  switch (env) {
    case Environment.mainnet:
      return 'TODO_FILECOIN_MAINNET_RPC'
    case Environment.testnet:
      return 'TODO_FILECOIN_TESTNET_RPC'
    case Environment.devnet:
      return 'TODO_FILECOIN_DEVNET_RPC'
    case Environment.local:
      return 'TODO_FILECOIN_LOCAL_RPC'
    default:
      throw new Error(`Unsupported environment: ${env}`)
  }
}

export interface ClientOptions {
  /** TODO: Filecoin network environment */
  environment: Environment
  /** Optional custom RPC URL */
  rpcUrl?: string
  /** Optional backend API endpoint */
  endpoint?: string
}

export interface UploadParams
  extends Pick<CreateDepositArgs, 'signTransaction' | 'userEmail'> {
  /**
   * TODO:
   * Replace Solana PublicKey with Filecoin address type
   */
  payer: string
  file: File[]
  durationDays: number
}

/**
 * @deprecated Use {@link UploadParams} instead.
 */
export type DepositParams = UploadParams

/**
 * Storage Client
 * TODO: Currently wired for Solana flow.
 * Will reuse the same client interface for Filecoin.
 */
export class Client {
  private rpcUrl: string
  private apiEndpoint: string

  constructor(options: ClientOptions) {
    this.rpcUrl = options.rpcUrl || getRpcUrl(options.environment)
    this.apiEndpoint = options.endpoint || getEndpointForRpc(this.rpcUrl)
  }

  /**
   * TODO:
   * Replace Solana transaction creation with Filecoin message signing
   */
  async createDeposit({
    payer,
    file,
    durationDays,
    signTransaction,
    userEmail,
  }: UploadParams): Promise<UploadResult> {
    console.log('Creating deposit (Filecoin TODO) with RPC:', this.rpcUrl)

    // TODO:
    // Replace Solana Connection with Filecoin provider / lotus client
    return await createDepositTxn(
      {
        file,
        duration: durationDays * DAY_TIME_IN_SECONDS,
        payer,
        // connection: TODO_FILECOIN_PROVIDER
        signTransaction,
        userEmail,
      } as any,
      this.apiEndpoint,
    )
  }

  /**
   * Estimate storage cost
   * TODO:
   * Pricing logic remains the same, currency naming will change
   */
  async estimateStorageCost(file: File[], duration: number) {
    const fileSizeInBytes = file.reduce((acc, f) => acc + f.size, 0)
    const durationInDays = Math.floor(duration / 86400)

    const response = await fetch(
      `${this.apiEndpoint}/pricing/quote?size=${fileSizeInBytes}&duration=${durationInDays}`,
    )

    if (!response.ok) throw new Error('Failed to get storage cost estimate')

    const { quote } = await response.json()

    // TODO:
    // Replace lamports/SOL with Filecoin units (FIL / attoFIL)
    return {
      token: quote.totalCost,
      smallestUnit: quote.totalCost,
    }
  }

  async getUserUploadHistory(userAddress: string, page: number, limit: number) {
    return await getUserUploadHistory(userAddress, this.apiEndpoint, {
      page,
      limit,
    })
  }

  /**
   * TODO:
   * Reuse for Filecoin renewal cost calculation
   */
  async getStorageRenewalCost(
    cid: string,
    duration: number,
  ): Promise<StorageRenewalCost | null> {
    return await getStorageRenewalCost(cid, duration, this.apiEndpoint)
  }

  /**
   * TODO:
   * Replace Solana renewal transaction with Filecoin message execution
   */
  async renewStorageDuration({
    cid,
    duration,
    payer,
    signTransaction,
  }: StorageRenewalParams): Promise<UploadResult> {
    return await renewStorageTxn(
      {
        cid,
        duration,
        payer,
        // connection: TODO_FILECOIN_PROVIDER
        signTransaction,
      } as any,
      this.apiEndpoint,
    )
  }

  /**
   * TODO:
   * Replace SOL price endpoint with FIL price
   */
  async getTokenPrice(): Promise<number> {
    const request = await fetch(`${this.apiEndpoint}/pricing/token`)
    if (!request.ok) throw new Error("Couldn't fetch token price")
    const data = await request.json()
    return data.price
  }
}
