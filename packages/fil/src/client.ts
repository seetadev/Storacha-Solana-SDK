import { JsonRpcProvider } from 'ethers'
import { FILECOIN_RPC } from './constants'

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

/**
 * Filecoin Storage Client
 */
export class Client {
  private rpcUrl: string
  public provider: JsonRpcProvider

  constructor(options: ClientOptions) {
    this.rpcUrl = options.rpcUrl || getRpcUrl(options.environment)
    this.provider = new JsonRpcProvider(this.rpcUrl)
  }

  /**
   * Create deposit transaction (FIL / USDFC)
   */
  async createDeposit() {
    console.log('Creating Filecoin deposit using RPC:', this.rpcUrl)

    const network = await this.provider.getNetwork()
    console.log('Connected to chain:', network.chainId)

    throw new Error('Not implemented')
  }
}
