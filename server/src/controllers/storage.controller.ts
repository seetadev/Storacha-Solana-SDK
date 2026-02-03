import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { renewStorageDuration, saveTransaction } from '../db/uploads-table.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import {
  getAmountInLamportsFromUSD,
  getAmountInSOL,
  getNewStorageExpirationDate,
  ONE_BILLION_LAMPORTS,
} from '../utils/constant.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/storacha.js'
import { createStorageRenewalTransaction } from './solana.controller.js'

/**
 * Get what it'll cost for a storage renewal
 */
export const getStorageRenewalCost = async (req: Request, res: Response) => {
  try {
    const { cid, duration } = req.query
    if (!cid || !duration) {
      return res.status(400).json({
        message: 'CID and the new duartion are required',
      })
    }

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid as string))
      .limit(1)

    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: "There's no upload for this CID",
      })
    }

    const deposit = deposits[0]
    const fileSizeInBytes = deposit.fileSize || 0
    const days = parseInt(duration as string, 10)

    const { ratePerBytePerDay } = await getPricingConfig()
    const solPrice = await getSolPrice()
    const totalLamports = getAmountInLamportsFromUSD(
      fileSizeInBytes,
      ratePerBytePerDay,
      days,
      solPrice,
    )

    const newExpirationDate = getNewStorageExpirationDate(
      String(deposit.expiresAt),
      Number(duration),
    )

    return res.status(200).json({
      newExpirationDate,
      currentExpirationDate: deposit.expiresAt,
      additionalDays: days,
      costInLamports: totalLamports,
      costInSOL: totalLamports / ONE_BILLION_LAMPORTS,
      fileDetails: {
        cid: deposit.contentCid,
        fileName: deposit.fileName,
        fileSize: deposit.fileSize,
      },
    })
  } catch (error) {
    logger.error('Error retrieving storage renewal cost', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Failed to get renewal cost',
    })
  }
}

/**
 * Initiate payment for storage renewal
 */
export const renewStorage = async (req: Request, res: Response) => {
  try {
    const { cid, duration, publicKey } = req.body

    if (!cid || !duration || !publicKey) {
      return res.status(400).json({
        message: 'The duration, CID, and publicKey are required',
      })
    }

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)
    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: 'Upload not available',
      })
    }

    const deposit = deposits[0]
    if (deposit.deletionStatus === 'deleted') {
      return res.status(400).json({
        message:
          "You can't renew storage for an upload that has already been removed on IPFS",
      })
    }

    const days = parseInt(duration, 10)
    const { ratePerBytePerDay } = await getPricingConfig()
    const solPrice = await getSolPrice()
    const amountInLamports = getAmountInLamportsFromUSD(
      Number(deposit.fileSize),
      ratePerBytePerDay,
      days,
      solPrice,
    )

    const storageRenewalIx = await createStorageRenewalTransaction({
      publicKey,
      durationDays: days,
      contentCID: cid,
      extensionCost: amountInLamports,
    })

    Sentry.setUser({ id: publicKey })
    Sentry.setContext('storage-renewal', {
      cid,
      duration,
      fileSize: deposit.fileSize,
    })
    Sentry.setTag('operation', 'storage-renewal')

    return res.status(200).json({
      cid,
      message: 'Storage renewal instruction is ready. Sign it',
      instructions: storageRenewalIx,
      duration: days,
      cost: {
        lamports: amountInLamports,
        sol: getAmountInSOL(amountInLamports),
      },
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error making storage renewal', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Failed to renew storage duration',
    })
  }
}

/**
 * Confirm storage duration renewal
 */
export const confirmStorageRenewal = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash, duration } = req.body

    if (!cid || !transactionHash || !duration)
      return res.status(400).json({
        message: 'CID, transactionHash, and duration are required',
      })

    const updated = await renewStorageDuration(cid, parseInt(duration, 10))

    if (!updated)
      return res.status(404).json({
        message: 'Failed to update storage duration',
      })

    const days = parseInt(duration, 10)
    const { ratePerBytePerDay } = await getPricingConfig()
    const solPrice = await getSolPrice()
    const amountInLamports = getAmountInLamportsFromUSD(
      Number(updated.fileSize),
      ratePerBytePerDay,
      days,
      solPrice,
    )

    // Add renewal transaction to audit trail
    await saveTransaction({
      depositId: updated.id,
      contentCid: cid,
      transactionHash: transactionHash,
      transactionType: 'renewal',
      amountInLamports: amountInLamports,
      durationDays: days,
    })

    return res.status(200).json({
      message: 'Storage renewed successfully',
      deposit: updated,
    })
  } catch (error) {
    logger.error('Error confirming renewal', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Failed to confirm renewal',
    })
  }
}
