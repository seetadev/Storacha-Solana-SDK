/**
 * Algorand Agent Upload Controller
 *
 * Runs AFTER algoX402Middleware() has:
 *   - Returned a 402 to the client (first request, no X-PAYMENT)
 *   - Decoded the signed transaction bytes from X-PAYMENT (second request)
 *   - Attached algoSignedTxnBytes, algoRequiredMicroAlgo, algoRecipient to req
 *
 * This controller:
 *   1. Verifies the Algorand payment is on-chain (calls verify.service.ts)
 *   2. Deduplicates by CID (same as the EVM agent controller)
 *   3. Pins the file to IPFS via Pinata
 *   4. Records the upload in the DB with paymentChain = 'algo'
 *   5. Returns { cid, expiresAt, fileName, fileSize, paymentTxId }
 */

import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { verifyAlgoPayment } from '../services/algo/verify.service.js'
import { pinFiles } from '../services/storage/pinata.service.js'
import { AlgoPaymentRequest } from '../middlewares/algo-x402.middleware.js'
import { computeCID } from '../utils/compute-cid.js'
import { getAmountInUSD } from '../utils/constant.js'
import { getExpiryDate } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'

/**
 * POST /upload/algo-agent?size=<bytes>&duration=<days>
 *
 * Protected by algoX402Middleware(). By the time this runs:
 *   - X-PAYMENT has been validated structurally (base64 decodes cleanly)
 *   - req.algoSignedTxnBytes, req.algoRequiredMicroAlgo, req.algoRecipient are set
 *
 * We still run full on-chain verification here so payment is confirmed before
 * any IPFS pinning or DB writes happen.
 */
export const uploadAlgoAgentFile = async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }

    const size = parseInt(req.query.size as string, 10)
    const duration = parseInt(req.query.duration as string, 10)

    if (Number.isNaN(size) || size <= 0) {
      res
        .status(400)
        .json({
          message: '"size" query param is required (file size in bytes)',
        })
      return
    }
    if (Number.isNaN(duration) || duration <= 0) {
      res
        .status(400)
        .json({ message: '"duration" query param is required (days)' })
      return
    }

    // Cast request to access fields attached by the middleware
    const algoReq = req as Request & AlgoPaymentRequest

    // ── Step 1: Verify the Algorand payment on-chain ───────────────────────────
    const { txId, senderAddress, amountPaid } = await verifyAlgoPayment(
      algoReq.algoSignedTxnBytes,
      algoReq.algoRecipient,
      algoReq.algoRequiredMicroAlgo,
    )

    // ── Step 2: Compute CID and check for duplicates ───────────────────────────
    const fileMap: Record<string, Uint8Array> = {
      [file.originalname]: new Uint8Array(file.buffer),
    }
    const computedCID = await computeCID(fileMap)

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, computedCID))
      .limit(1)

    if (existing.length > 0 && existing[0].transactionHash) {
      res.status(409).json({
        message: 'This file has already been uploaded',
        cid: existing[0].contentCid,
        expiresAt: existing[0].expiresAt,
      })
      return
    }

    // ── Step 3: Pin file to IPFS via Pinata ────────────────────────────────────
    const pinnedCID = await pinFiles(
      {
        [file.originalname]: {
          buffer: new Uint8Array(file.buffer),
          mimetype: file.mimetype,
        },
      },
      file.originalname,
    )

    if (pinnedCID !== computedCID) {
      logger.warn('CID mismatch between pre-computed and Pinata-pinned', {
        computed: computedCID,
        pinned: pinnedCID,
      })
    }

    // ── Step 4: Write upload record to DB ─────────────────────────────────────
    const expiresAt = getExpiryDate(duration)

    const { ratePerBytePerDay } = await getPricingConfig()
    const costUSD = Math.max(
      getAmountInUSD(size, ratePerBytePerDay, duration),
      0.000001,
    )

    // Store depositAmount in microALGO (analogous to microUSDC for Base uploads)
    const depositAmount = amountPaid

    const depositItem: typeof uploads.$inferInsert = {
      depositAmount,
      durationDays: duration,
      contentCid: computedCID,
      depositKey: senderAddress,
      depositSlot: 1,
      lastClaimedSlot: 1,
      expiresAt,
      createdAt: new Date().toISOString(),
      userEmail: null,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      transactionHash: txId,
      deletionStatus: 'active',
      warningSentAt: null,
      paymentChain: 'algo',
      paymentToken: 'ALGO',
    }

    await db.insert(uploads).values(depositItem)

    logger.info('Algo agent upload complete', {
      cid: computedCID,
      fileSize: file.size,
      duration,
      senderAddress,
      costUSD,
      amountPaidMicroAlgo: amountPaid,
      txId,
    })

    Sentry.setContext('algo-agent-upload', {
      cid: computedCID,
      fileSize: file.size,
      duration,
      paymentChain: 'algo',
      txId,
    })
    Sentry.setTag('operation', 'algo-agent-upload')
    Sentry.setTag('payment_chain', 'algo')

    // ── Step 5: Return success ─────────────────────────────────────────────────
    res.status(200).json({
      cid: computedCID,
      expiresAt,
      fileName: file.originalname,
      fileSize: file.size,
      paymentTxId: txId,
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Algo agent upload error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      message: 'Algo agent upload failed',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
