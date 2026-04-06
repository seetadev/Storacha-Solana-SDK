import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { pinFiles } from '../services/storage/pinata.service.js'
import { computeCID } from '../utils/compute-cid.js'
import { getAmountInUSD } from '../utils/constant.js'
import { getExpiryDate } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'

// we should likely consider how renewal would work for agents, in the future.
// for now, we can bank on the idea that agents may store for long-running course
// or epochs, say 2 years or more. regardless, we still need to factor it.
/**
 * Agent file upload — runs after x402 payment middleware has verified the USDC payment.
 *
 * Query params:
 *   ?size=<bytes>     — declared file size (used by x402 for pricing)
 *   ?duration=<days>  — storage duration in days
 *
 * The agent sends the file in the multipart body as the "file" field.
 * Payment is verified by x402 middleware before this handler is called.
 */
export const uploadAgentFile = async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ message: 'No file uploaded' })

    const size = parseInt(req.query.size as string, 10)
    const duration = parseInt(req.query.duration as string, 10)

    if (Number.isNaN(size) || size <= 0)
      return res.status(400).json({
        message: '"size" query param is required (file size in bytes)',
      })

    if (Number.isNaN(duration) || duration <= 0)
      return res
        .status(400)
        .json({ message: '"duration" query param is required (days)' })

    const fileMap: Record<string, Uint8Array> = {
      [file.originalname]: new Uint8Array(file.buffer),
    }

    const computedCID = await computeCID(fileMap)

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, computedCID))
      .limit(1)

    if (existing.length > 0 && existing[0].transactionHash)
      return res.status(409).json({
        message: 'This file has already been uploaded',
        cid: existing[0].contentCid,
        expiresAt: existing[0].expiresAt,
      })

    const pinnedCID = await pinFiles(
      {
        [file.originalname]: {
          buffer: new Uint8Array(file.buffer),
          mimetype: file.mimetype,
        },
      },
      file.originalname,
    )

    if (pinnedCID !== computedCID)
      logger.warn('CID mismatch between pre-computed and pinned', {
        computed: computedCID,
        pinned: pinnedCID,
      })

    let payerAddress = 'agent'
    const xPayment = req.headers['x-payment'] as string | undefined
    if (xPayment) {
      try {
        const decoded = JSON.parse(Buffer.from(xPayment, 'base64').toString())
        payerAddress = decoded?.payload?.authorization?.from || 'agent'
      } catch {
        // leave it as 'agent'
      }
    }

    const expiresAt = getExpiryDate(duration)

    // use a synthetic tx hash — x402 payment is verified by the middleware,
    // on-chain settlement happens asynchronously via Coinbase facilitator
    const transactionHash = `x402:base:${Date.now()}:${computedCID.slice(0, 12)}`

    // USDC has 6 decimals. store amount in micro-USDC (same unit as USDC atomic units).
    // apply the same $0.000001 floor the x402 middleware uses.
    const { ratePerBytePerDay } = await getPricingConfig()
    const costUSD = Math.max(
      getAmountInUSD(size, ratePerBytePerDay, duration),
      0.000001,
    )
    const depositAmount = Math.ceil(costUSD * 1_000_000)

    const depositItem: typeof uploads.$inferInsert = {
      depositAmount,
      durationDays: duration,
      contentCid: computedCID,
      depositKey: payerAddress,
      depositSlot: 1,
      lastClaimedSlot: 1,
      expiresAt,
      createdAt: new Date().toISOString(),
      userEmail: null,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      transactionHash,
      deletionStatus: 'active',
      warningSentAt: null,
      paymentChain: 'base',
      paymentToken: 'USDC',
    }

    await db.insert(uploads).values(depositItem)

    logger.info('Agent upload complete', {
      cid: computedCID,
      fileSize: file.size,
      duration,
      payerAddress,
      costUSD,
      depositAmount,
    })

    Sentry.setContext('agent-upload', {
      cid: computedCID,
      fileSize: file.size,
      duration,
      paymentChain: 'base',
    })
    Sentry.setTag('operation', 'agent-upload')
    Sentry.setTag('payment_chain', 'base')

    return res.status(200).json({
      cid: computedCID,
      expiresAt,
      fileName: file.originalname,
      fileSize: file.size,
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Agent upload error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Agent upload failed',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
