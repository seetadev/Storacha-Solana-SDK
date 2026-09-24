import algosdk from 'algosdk'
import {
  ALGOD_SERVERS,
  ALGOD_TOKEN_DEFAULT,
  CONFIRMATION_ROUNDS,
  ENDPOINTS,
  PRICING_ROUTE,
  UPLOAD_ROUTE,
} from './constants'
import type {
  AlgoAgentClientOptions,
  AlgoPaymentRequirement,
  Environment,
  PaymentRequiredResponse,
  StorageCostEstimate,
  StoreOptions,
  StoreResult,
} from './types'

/**
 * Cross-platform Uint8Array → base64 encoder.
 * Works in Node.js (≥16) and all modern browsers without importing `Buffer`.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export class AlgoAgentClient {
  private readonly account: algosdk.Account
  private readonly algodClient: algosdk.Algodv2
  private readonly apiEndpoint: string
  private readonly environment: Environment

  constructor({
    mnemonic,
    environment,
    endpoint,
    algodServer,
    algodToken,
  }: AlgoAgentClientOptions) {
    this.environment = environment
    this.apiEndpoint = endpoint ?? ENDPOINTS[environment]

    // Derive the Algorand account from the mnemonic
    this.account = algosdk.mnemonicToSecretKey(mnemonic)

    // Initialise the algod client — used to fetch tx params and submit payments
    this.algodClient = new algosdk.Algodv2(
      algodToken ?? ALGOD_TOKEN_DEFAULT,
      algodServer ?? ALGOD_SERVERS[environment],
      '', // port is embedded in the URL for public nodes
    )
  }

  /**
   * The Algorand address derived from the provided mnemonic.
   * Useful for logging or pre-flight balance checks.
   */
  get address(): string {
    return this.account.addr.toString()
  }

  /**
   * Store a file on IPFS. Payment in ALGO is handled automatically
   * via the x402 protocol — no wallet popups, no human in the loop.
   *
   * Flow:
   *   1. POST to /upload/algo-agent (no payment header) → server returns 402
   *   2. Parse the Algorand payment requirement from the 402 body
   *   3. Build, sign, and submit an Algorand payment transaction
   *   4. Wait for on-chain confirmation
   *   5. Retry the upload with the signed transaction in X-PAYMENT header
   *   6. Server verifies on-chain and pins the file to IPFS
   *
   * @example
   * const { cid, expiresAt } = await client.store(file, { durationDays: 30 })
   */
  async store(
    file: File,
    { durationDays }: StoreOptions,
  ): Promise<StoreResult> {
    const url = `${this.apiEndpoint}${UPLOAD_ROUTE}?size=${file.size}&duration=${durationDays}`

    // ── Step 1: probe the endpoint to receive the 402 payment details ──────────
    const probeForm = new FormData()
    probeForm.append('file', file)

    const probeRes = await fetch(url, { method: 'POST', body: probeForm })

    if (probeRes.status !== 402) {
      // If we somehow skipped payment (shouldn't happen), handle it gracefully
      if (probeRes.ok) return probeRes.json() as Promise<StoreResult>
      const errBody = (await probeRes.json().catch(() => ({}))) as {
        message?: string
        error?: string
      }
      throw new Error(
        errBody.message ??
          errBody.error ??
          `Unexpected status ${probeRes.status}`,
      )
    }

    const paymentRequired = (await probeRes.json()) as PaymentRequiredResponse

    // ── Step 2: select the Algorand payment requirement ────────────────────────
    const requirement = paymentRequired.accepts.find(
      (a): a is AlgoPaymentRequirement => a.scheme === 'algorand',
    )
    if (!requirement) {
      throw new Error(
        'Server does not accept Algorand payments for this endpoint',
      )
    }

    const amountMicroAlgo = Number(requirement.maxAmountRequired)
    if (isNaN(amountMicroAlgo) || amountMicroAlgo <= 0) {
      throw new Error(
        `Invalid payment amount from server: ${requirement.maxAmountRequired}`,
      )
    }

    // ── Step 3: build + sign the Algorand payment transaction ─────────────────
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: this.account.addr,
      receiver: requirement.recipient,
      amount: amountMicroAlgo,
      suggestedParams,
      note: new TextEncoder().encode(
        requirement.memo ?? `toju-${file.size}-${durationDays}`,
      ),
    })

    const signedTxnBytes = paymentTxn.signTxn(this.account.sk)

    // ── Step 4: submit to Algorand and wait for confirmation ──────────────────
    const submitRes = await this.algodClient
      .sendRawTransaction(signedTxnBytes)
      .do()
    const txId: string = submitRes.txid

    await algosdk.waitForConfirmation(
      this.algodClient,
      txId,
      CONFIRMATION_ROUNDS,
    )

    // ── Step 5: retry the upload with the payment proof in the header ─────────
    // Encode the signed transaction bytes as base64 for the X-PAYMENT header.
    // Uses a cross-platform approach (works in Node.js and browsers alike).
    const base64SignedTxn = uint8ArrayToBase64(signedTxnBytes)

    const uploadForm = new FormData()
    uploadForm.append('file', file)

    const uploadRes = await fetch(url, {
      method: 'POST',
      headers: { 'X-PAYMENT': `algorand ${base64SignedTxn}` },
      body: uploadForm,
    })

    if (!uploadRes.ok) {
      const errBody = (await uploadRes.json().catch(() => ({}))) as {
        message?: string
        error?: string
      }
      throw new Error(
        errBody.message ??
          errBody.error ??
          `Upload failed with status ${uploadRes.status}`,
      )
    }

    const result = (await uploadRes.json()) as Omit<StoreResult, 'paymentTxId'>
    return { ...result, paymentTxId: txId }
  }

  /**
   * Estimate the ALGO cost for storing a file before committing to an upload.
   * Useful for agents that need to check wallet balance before proceeding.
   *
   * @example
   * const { algo, usd, microAlgo } = await client.estimateStorageCost(1_000_000, 30)
   * console.log(`Cost: ${algo} ALGO (~$${usd})`)
   */
  async estimateStorageCost(
    sizeInBytes: number,
    durationDays: number,
  ): Promise<StorageCostEstimate> {
    const res = await fetch(
      `${this.apiEndpoint}${PRICING_ROUTE}?size=${sizeInBytes}&duration=${durationDays}&chain=algo`,
    )

    if (!res.ok)
      throw new Error('Failed to fetch storage cost estimate from toju API')

    const { quote } = (await res.json()) as {
      quote: { totalCost: number; algoPrice?: number }
    }
    const totalUsd: number = quote.totalCost

    // Fallback to 0.15 USD/ALGO if the server doesn't return an algoPrice.
    // Replace with a live oracle feed in production.
    const algoUsdPrice: number = quote.algoPrice ?? 0.15
    const totalAlgo = totalUsd / algoUsdPrice
    const microAlgo = Math.ceil(totalAlgo * 1_000_000)

    return {
      algo: totalAlgo.toFixed(6),
      usd: totalUsd.toFixed(2),
      microAlgo,
    }
  }
}

/** Convenience factory function — mirrors the pattern used in @toju.network/x402 */
export function createAlgoAgentClient(
  options: AlgoAgentClientOptions,
): AlgoAgentClient {
  return new AlgoAgentClient(options)
}

export type { Environment }
