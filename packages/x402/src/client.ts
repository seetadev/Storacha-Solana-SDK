import { ExactEvmScheme } from '@x402/evm/exact/client'
import { wrapFetchWithPayment, x402Client } from '@x402/fetch'
import type { Network } from '@x402/core/types'
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { CHAINS, ENDPOINTS, NETWORKS } from './constants'
import {
  AgentClientOptions,
  Environment,
  StorageCostEstimate,
  StoreOptions,
  StoreResult,
} from './types'

export class AgentClient {
  private apiEndpoint: string
  private network: string
  private fetchWithPay: ReturnType<typeof wrapFetchWithPayment>

  constructor({ privateKey, environment, endpoint }: AgentClientOptions) {
    this.apiEndpoint = endpoint || ENDPOINTS[environment]
    this.network = NETWORKS[environment]

    const account = privateKeyToAccount(privateKey)
    const walletClient = createWalletClient({
      account,
      chain: CHAINS[environment],
      transport: http(),
    }).extend(publicActions)

    const signer = {
      address: account.address,
      signTypedData: (args: Parameters<typeof walletClient.signTypedData>[0]) =>
        walletClient.signTypedData(args),
      readContract: walletClient.readContract,
    }

    const x402 = new x402Client().register(
      this.network as Network,
      new ExactEvmScheme(signer),
    )
    this.fetchWithPay = wrapFetchWithPayment(fetch, x402)
  }

  /**
   * Store a file on IPFS. Payment in USDC on Base is handled automatically
   * via the x402 protocol — no wallet popups, no human in the loop.
   *
   * @example
   * const { cid, expiresAt } = await client.store(file, { durationDays: 30 })
   */
  async store(
    file: File,
    { durationDays }: StoreOptions,
  ): Promise<StoreResult> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.apiEndpoint}/upload/agent?size=${file.size}&duration=${durationDays}`
    const res = await this.fetchWithPay(url, { method: 'POST', body: formData })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        err.message || err.error || `Upload failed with status ${res.status}`,
      )
    }

    return res.json()
  }

  /**
   * Estimate the USDC cost before storing, so the agent can decide whether to proceed.
   *
   * @example
   * const { usdc, usd } = await client.estimateStorageCost(file.size, 30)
   * console.log(`Storing this file will cost ${usdc} USDC`)
   */
  async estimateStorageCost(
    sizeInBytes: number,
    durationDays: number,
  ): Promise<StorageCostEstimate> {
    const res = await fetch(
      `${this.apiEndpoint}/pricing/quote?size=${sizeInBytes}&duration=${durationDays}&chain=base`,
    )

    if (!res.ok) throw new Error('Failed to get storage cost estimate')

    const { quote } = await res.json()
    const totalUSD: number = quote.totalCost

    return {
      usdc: totalUSD.toFixed(6),
      usd: totalUSD.toFixed(2),
    }
  }
}

export function createAgentClient(options: AgentClientOptions): AgentClient {
  return new AgentClient(options)
}

export type { Environment }
