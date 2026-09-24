/**
 * Algorand x402 Middleware
 *
 * This is the server-side "facilitator" for Algorand payments. Because there is
 * no official @x402/algorand package, we implement the protocol manually:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  First request (no X-PAYMENT header)                            │
 * │   → Compute required microALGO from ?size + ?duration           │
 * │   → Return HTTP 402 with Algorand payment requirement           │
 * │                                                                 │
 * │  Retry request (X-PAYMENT: algorand <base64-signed-txn>)        │
 * │   → Decode the base64 signed transaction bytes                  │
 * │   → Attach to req for the controller to verify + record         │
 * │   → Call next() — controller takes over                         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * The client (packages/algo) is responsible for:
 *   1. Receiving the 402
 *   2. Building + signing + SUBMITTING the Algorand payment tx on-chain
 *   3. Waiting for confirmation
 *   4. Re-sending the request with the signed tx bytes in X-PAYMENT
 *
 * The server does NOT submit the transaction — it only verifies an already-confirmed one.
 * This avoids double-spend: by the time X-PAYMENT arrives, the tx is already on-chain.
 */

import { RequestHandler } from 'express'
import { getAlgoPrice } from '../services/price/algo-price.service.js'
import { getAmountInUSD } from '../utils/constant.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'

const isMainnet = process.env.ALGO_NETWORK === 'mainnet'
const ALGO_NETWORK = isMainnet ? 'mainnet' : 'testnet'

/** Your server's Algorand receiving address (set ALGO_WALLET_ADDRESS in .env) */
const ALGO_RECIPIENT = process.env.ALGO_WALLET_ADDRESS

/**
 * Shape of the 402 response body.
 * Clients parse `accepts[0]` to know where to send ALGO and how much.
 */
interface AlgoPaymentRequirement {
  scheme: 'algorand'
  network: typeof ALGO_NETWORK
  /** Amount required, in microALGO (1 ALGO = 1,000,000 microALGO) */
  maxAmountRequired: string
  asset: 'ALGO'
  recipient: string
  /** Human-readable memo that the client should include in the transaction note */
  memo: string
}

/**
 * Augmented Express request — set by this middleware so the controller
 * can access the decoded payment bytes and derived tx metadata.
 */
export interface AlgoPaymentRequest {
  /** Raw signed-transaction bytes decoded from the X-PAYMENT header */
  algoSignedTxnBytes: Uint8Array
  /** Required microALGO amount computed from size + duration */
  algoRequiredMicroAlgo: number
  /** The recipient address the client must have paid to */
  algoRecipient: string
}

/**
 * Returns an Express middleware that guards the route with Algorand x402.
 *
 * Mount it directly on the route — not router-wide — so only /algo-agent is gated:
 *
 *   uploadsRouter.post('/algo-agent', upload.single('file'), algoX402Middleware(), controller)
 */
export function algoX402Middleware(): RequestHandler {
  if (!ALGO_RECIPIENT) {
    logger.warn(
      'ALGO_WALLET_ADDRESS is not set — POST /upload/algo-agent will not require payment',
    )
  }

  return async (req, res, next) => {
    // ── Parse size / duration from query ──────────────────────────────────────
    const sizeBytes = parseInt((req.query.size as string) || '0', 10)
    const durationDays = parseInt((req.query.duration as string) || '1', 10)

    if (isNaN(sizeBytes) || sizeBytes <= 0) {
      res.status(400).json({ error: '"size" query param is required (bytes)' })
      return
    }
    if (isNaN(durationDays) || durationDays <= 0) {
      res
        .status(400)
        .json({ error: '"duration" query param is required (days)' })
      return
    }

    // ── Skip payment gate if wallet not configured (dev/staging convenience) ──
    if (!ALGO_RECIPIENT) {
      return next()
    }

    const xPayment = req.headers['x-payment'] as string | undefined

    // ── No payment header → issue 402 with Algorand payment details ───────────
    if (!xPayment?.startsWith('algorand ')) {
      try {
        const { ratePerBytePerDay } = await getPricingConfig()
        const costUSD = Math.max(
          getAmountInUSD(sizeBytes, ratePerBytePerDay, durationDays),
          0.000001, // floor to avoid zero-price edge cases
        )

        const algoUsdPrice = await getAlgoPrice()
        const microAlgoRequired = Math.ceil(
          (costUSD / algoUsdPrice) * 1_000_000,
        )

        const requirement: AlgoPaymentRequirement = {
          scheme: 'algorand',
          network: ALGO_NETWORK,
          maxAmountRequired: String(microAlgoRequired),
          asset: 'ALGO',
          recipient: ALGO_RECIPIENT,
          memo: `toju-${sizeBytes}-${durationDays}`,
        }

        logger.info('Algorand x402: returning 402', {
          sizeBytes,
          durationDays,
          costUSD,
          microAlgoRequired,
          recipient: ALGO_RECIPIENT,
        })

        res.status(402).json({
          x402Version: 1,
          error: 'Payment required',
          accepts: [requirement],
        })
        return
      } catch (err) {
        logger.error(
          'Algorand x402: failed to compute price for 402 response',
          {
            error: err instanceof Error ? err.message : String(err),
          },
        )
        res.status(500).json({ error: 'Failed to compute payment requirement' })
        return
      }
    }

    // ── Payment header present → decode and attach to request ─────────────────
    try {
      const base64Txn = xPayment.replace('algorand ', '').trim()
      const signedTxnBytes = Uint8Array.from(Buffer.from(base64Txn, 'base64'))

      // Compute the required amount again so the controller can verify it
      const { ratePerBytePerDay } = await getPricingConfig()
      const costUSD = Math.max(
        getAmountInUSD(sizeBytes, ratePerBytePerDay, durationDays),
        0.000001,
      )
      const algoUsdPrice = await getAlgoPrice()
      const microAlgoRequired = Math.ceil((costUSD / algoUsdPrice) * 1_000_000)

      // Attach decoded payment data to the request object
      const algoReq = req as typeof req & AlgoPaymentRequest
      algoReq.algoSignedTxnBytes = signedTxnBytes
      algoReq.algoRequiredMicroAlgo = microAlgoRequired
      algoReq.algoRecipient = ALGO_RECIPIENT

      logger.info(
        'Algorand x402: payment header decoded, passing to controller',
        {
          sizeBytes,
          durationDays,
          microAlgoRequired,
        },
      )

      return next()
    } catch (err) {
      logger.error('Algorand x402: failed to decode X-PAYMENT header', {
        error: err instanceof Error ? err.message : String(err),
      })
      res
        .status(400)
        .json({
          error:
            'Invalid X-PAYMENT header — could not decode signed transaction',
        })
      return
    }
  }
}
