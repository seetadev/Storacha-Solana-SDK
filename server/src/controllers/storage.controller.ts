import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { configTable, uploads } from '../db/schema.js'
import { renewStorageDuration, saveTransaction } from '../db/uploads-table.js'
import {
  getUsdfcContractAddress,
  verifyErc20Transfer,
} from '../services/fil/verify.service.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import {
  getAmountInLamportsFromUSD,
  getAmountInSOL,
  getAmountInUSD,
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
    const chain = (req.query.chain as string) || 'sol'

    const newExpirationDate = getNewStorageExpirationDate(
      String(deposit.expiresAt),
      Number(duration),
    )

    const fileDetails = {
      cid: deposit.contentCid,
      fileName: deposit.fileName,
      fileSize: deposit.fileSize,
    }

    if (chain === 'fil') {
      const costUSD = getAmountInUSD(
        Number(fileSizeInBytes),
        ratePerBytePerDay,
        days,
      )
      const costInUsdfc = BigInt(Math.ceil(costUSD * 1e18))

      return res.status(200).json({
        newExpirationDate,
        currentExpirationDate: deposit.expiresAt,
        additionalDays: days,
        costUSD,
        costInUsdfc: costInUsdfc.toString(),
        fileDetails,
      })
    }

    const solPrice = await getSolPrice()
    const totalLamports = getAmountInLamportsFromUSD(
      fileSizeInBytes,
      ratePerBytePerDay,
      days,
      solPrice,
    )

    return res.status(200).json({
      newExpirationDate,
      currentExpirationDate: deposit.expiresAt,
      additionalDays: days,
      costInLamports: totalLamports,
      costInSOL: totalLamports / ONE_BILLION_LAMPORTS,
      fileDetails,
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

/**
 * Initiate USDFC payment for storage renewal.
 * Returns payment details so the client can send the ERC-20 transfer.
 */
export const renewStorageUsdFC = async (req: Request, res: Response) => {
  try {
    const { cid, duration, userAddress } = req.body

    if (!cid || !duration || !userAddress)
      return res.status(400).json({
        message: 'The duration, CID, and userAddress are required',
      })

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (!deposits || deposits.length === 0)
      return res.status(404).json({
        message: 'Upload not available',
      })

    const deposit = deposits[0]
    if (deposit.deletionStatus === 'deleted') {
      return res.status(400).json({
        message:
          "You can't renew storage for an upload that has already been removed on IPFS",
      })
    }

    const config = await db.select().from(configTable)
    if (!config[0].filecoinWallet)
      throw new Error('Filecoin wallet not configured')

    const days = parseInt(duration, 10)
    const { ratePerBytePerDay } = await getPricingConfig()
    const costUSD = getAmountInUSD(
      Number(deposit.fileSize),
      ratePerBytePerDay,
      days,
    )
    const costInUsdfc = BigInt(Math.ceil(costUSD * 1e18))

    const newExpirationDate = getNewStorageExpirationDate(
      String(deposit.expiresAt),
      days,
    )

    Sentry.setUser({ id: userAddress })
    Sentry.setContext('storage-renewal-usdfc', {
      cid,
      duration: days,
      fileSize: deposit.fileSize,
      chain: 'fil',
    })
    Sentry.setTag('operation', 'storage-renewal-usdfc')

    return res.status(200).json({
      cid,
      message: 'Renewal payment details ready — transfer USDFC to proceed',
      recipientAddress: config[0].filecoinWallet,
      usdfcContractAddress: getUsdfcContractAddress(),
      duration: days,
      newExpirationDate,
      cost: {
        usd: costUSD,
        usdfc: costInUsdfc.toString(),
      },
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error initiating USDFC storage renewal', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Failed to initiate USDFC storage renewal',
    })
  }
}

/**
 * Verify USDFC payment and confirm storage renewal
 */
export const confirmRenewalUsdFC = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash, duration, userAddress } = req.body

    if (!cid || !transactionHash || !duration || !userAddress)
      return res.status(400).json({
        message: 'CID, transactionHash, duration, and userAddress are required',
      })

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: 'Upload not found',
      })
    }

    const config = await db.select().from(configTable)
    if (!config[0].filecoinWallet)
      throw new Error('Filecoin wallet not configured')

    const days = parseInt(duration, 10)
    const { ratePerBytePerDay } = await getPricingConfig()
    const costUSD = getAmountInUSD(
      Number(deposits[0].fileSize),
      ratePerBytePerDay,
      days,
    )
    const expectedAmount = BigInt(Math.ceil(costUSD * 1e18))

    const { verified } = await verifyErc20Transfer({
      transactionHash,
      from: userAddress,
      to: config[0].filecoinWallet,
      contractAddress: getUsdfcContractAddress(),
      expectedAmount,
    })

    if (!verified)
      return res.status(400).json({
        message:
          'USDFC renewal payment verification failed. Transaction may not exist, may have failed, or the amount/recipient does not match.',
      })

    const updated = await renewStorageDuration(cid, days)

    if (!updated) {
      return res.status(404).json({
        message: 'Failed to update storage duration',
      })
    }

    await saveTransaction({
      depositId: updated.id,
      contentCid: cid,
      transactionHash,
      transactionType: 'renewal',
      amountInLamports: Number(expectedAmount),
      durationDays: days,
    })

    return res.status(200).json({
      verified: true,
      message: 'Storage renewed successfully with USDFC',
      deposit: updated,
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error confirming USDFC renewal', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Failed to confirm USDFC renewal',
    })
  }
}
