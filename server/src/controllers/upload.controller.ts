import { PublicKey } from '@solana/web3.js'
import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { getUserHistory, saveTransaction } from '../db/uploads-table.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { PaginationContext } from '../types.js'
import { computeCID } from '../utils/compute-cid.js'
import {
  DAY_TIME_IN_SECONDS,
  getAmountInLamportsFromUSD,
} from '../utils/constant.js'
import { getExpiryDate, getPaginationParams } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig, initStorachaClient } from '../utils/storacha.js'
import { createDepositTransaction } from './solana.controller.js'

const MIN_DURATION_SECONDS = DAY_TIME_IN_SECONDS // 1 day
// email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Function to upload a file to storacha
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })
    const files = [
      new File([file.buffer], file.originalname, { type: file.mimetype }),
    ]

    const client = await initStorachaClient()
    const uploadedCID = await client.uploadFile(files[0])

    if (uploadedCID.toString() !== cid) {
      throw new Error(
        `CID mismatch! Precomputed: ${cid}, Uploaded: ${uploadedCID}`,
      )
    }

    const uploadObject = {
      cid: uploadedCID,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: `https://w3s.link/ipfs/${cid}/${file.originalname}`,
      uploadedAt: new Date().toISOString(),
    }

    Sentry.setContext('file-upload', {
      cid,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    })

    res.status(200).json({
      message: 'Upload successful',
      cid: uploadedCID,
      object: uploadObject,
    })
  } catch (error: any) {
    Sentry.captureException(error)
    logger.error('Error uploading file to Storacha', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause: error?.cause,
    })
    res.status(400).json({
      message: 'Error uploading file to directory',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Allows upload of multiple files or a directory to storacha
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]

    if (!files) return res.status(400).json({ message: 'No files uploaded' })

    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })

    const fileObjects = files.map(
      (f) => new File([f.buffer], f.originalname, { type: f.mimetype }),
    )

    const client = await initStorachaClient()
    const uploadedCID = await client.uploadDirectory(fileObjects)

    if (uploadedCID.toString() !== cid)
      throw new Error(
        `CID mismatch! Computed: ${cid}, Uploaded: ${uploadedCID}`,
      )

    Sentry.setContext('multi-file-upload', {
      cid,
      fileSize: files?.reduce((acc, curr) => acc + curr.size, 0),
      fileNames: files.map((f) => f.originalname),
      mimeTypes: files.map((f) => f.mimetype),
    })
    Sentry.setTag('operation', 'multi-file-upload')

    const uploadObject = {
      cid: uploadedCID,
      directoryName: `Upload-${crypto.randomUUID()}`,
      url: `https://w3s.link/ipfs/${cid}`,
      size: files.reduce((sum, f) => sum + f.size, 0),
      files: files.map((f) => ({
        filename: f.originalname,
        size: f.size,
        type: f.mimetype,
        url: `https://w3s.link/ipfs/${cid}/${f.originalname}`,
      })),
      uploadedAt: new Date().toISOString(),
    }

    res.status(200).json({
      message: 'Upload successful',
      cid: uploadedCID,
      object: uploadObject,
    })
  } catch (error: any) {
    Sentry.captureException(error)
    logger.error('Error uploading files', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause: error?.cause,
    })
    res.status(400).json({
      message: 'Error uploading files',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Builds the deposit instruction for upload transaction
 */
export const deposit = async (req: Request, res: Response) => {
  try {
    // we're handling both single file and multiple files here as opposed to previous approach
    const files = req.files as
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] }
    let fileArray: Express.Multer.File[] = []

    if (Array.isArray(files)) {
      fileArray = files
    } else if (files && typeof files === 'object') {
      const fileField = files.file || files.files
      if (fileField && Array.isArray(fileField)) {
        fileArray = fileField
      } else {
        return res.status(400).json({ message: 'No files selected' })
      }
    } else {
      return res.status(400).json({ message: 'No files selected' })
    }

    if (fileArray.length === 0) {
      return res.status(400).json({ message: 'No files selected' })
    }

    const fileMap: Record<string, Uint8Array> = {}
    let totalSize = 0

    for (const file of fileArray) {
      fileMap[file.originalname] = new Uint8Array(file.buffer)
      totalSize += file.size
    }

    const { publicKey, duration, userEmail } = req.body

    // input validation
    try {
      new PublicKey(publicKey)
    } catch {
      return res.status(400).json({ message: 'Invalid Solana public key' })
    }

    const durationInSeconds = parseInt(duration as string, 10)
    if (
      Number.isNaN(durationInSeconds) ||
      durationInSeconds < MIN_DURATION_SECONDS
    ) {
      return res.status(400).json({
        message: `Duration must be at least ${MIN_DURATION_SECONDS} seconds`,
      })
    }

    if (
      userEmail &&
      (typeof userEmail !== 'string' || !EMAIL_RE.test(userEmail))
    ) {
      return res.status(400).json({ message: 'Invalid email address' })
    }
    const sanitizedEmail = userEmail
      ? userEmail.trim().slice(0, 254)
      : undefined

    const { ratePerBytePerDay } = await getPricingConfig()
    const solPrice = await getSolPrice()
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS)
    const amountInLamports = getAmountInLamportsFromUSD(
      totalSize,
      ratePerBytePerDay,
      duration_days,
      solPrice,
    )

    Sentry.setUser({
      id: publicKey,
      email: sanitizedEmail,
    })

    logger.info('Deposit calculation', {
      totalSize,
      ratePerBytePerDay,
      duration_days,
      solPrice,
      amountInLamports,
    })

    const computedCID = await computeCID(fileMap)

    Sentry.setContext('upload', {
      totalSize,
      fileCount: fileArray.length,
      duration: duration_days,
      cid: computedCID,
    })

    Sentry.setTag('operation', 'deposit')
    Sentry.setTag('file_count', fileArray.length)

    if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
      throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`)
    }

    const depositInstructions = await createDepositTransaction({
      publicKey,
      fileSize: totalSize,
      contentCID: computedCID,
      durationDays: duration_days,
      depositAmount: amountInLamports,
    })

    const backupExpirationDate = getExpiryDate(duration_days)

    // pass deposit meta later in the upload flow for db writes
    // after a succesful confirmation
    const depositMetadata = {
      depositAmount: amountInLamports,
      durationDays: duration_days,
      depositKey: publicKey,
      userEmail: sanitizedEmail || null,
      fileName: fileArray.length === 1 ? fileArray[0].originalname : null,
      fileType: fileArray.length === 1 ? fileArray[0].mimetype : 'directory',
      fileSize: totalSize,
      expiresAt: backupExpirationDate,
    }

    res.status(200).json({
      message: 'Deposit instruction ready — sign to finalize upload',
      cid: computedCID,
      instructions: depositInstructions,
      fileCount: fileArray.length,
      totalSize: totalSize,
      files: fileArray.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
      })),
      depositMetadata,
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error making a deposit', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(400).json({
      message: 'Error making a deposit',
    })
  }
}

/**
 * Function to get user upload history (paginated)
 */
export const getUploadHistory = async (req: Request, res: Response) => {
  try {
    const userAddress = req.query.userAddress as string

    if (!userAddress) {
      return res.status(400).json({
        message: 'User address is required',
      })
    }

    const { page, limit } = getPaginationParams(req.query)

    const paginationContext: PaginationContext = {
      baseUrl: req.baseUrl,
      path: req.path,
    }

    const result = await getUserHistory(
      userAddress,
      page,
      limit,
      paginationContext,
    )

    if (!result) {
      return res.status(400).json({
        message: 'Invalid request: unable to fetch upload history',
      })
    }

    return res.status(200).json(result)
  } catch (err) {
    Sentry.captureException(err)
    return res.status(500).json({
      message: 'Error getting the user history',
    })
  }
}

/**
 * Function to create DB record and save transaction hash after payment is confirmed
 */
export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash, depositMetadata } = req.body

    if (!cid || !transactionHash) {
      return res.status(400).json({
        message: 'CID and transaction hash are required',
      })
    }

    if (!depositMetadata) {
      return res.status(400).json({
        message: 'Deposit metadata is required',
      })
    }

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (existing.length > 0) {
      // exists but has no transaction hash, update it
      if (!existing[0].transactionHash) {
        const updated = await db
          .update(uploads)
          .set({ transactionHash: transactionHash })
          .where(eq(uploads.contentCid, cid))
          .returning()

        await saveTransaction({
          depositId: updated[0].id,
          contentCid: cid,
          transactionHash: transactionHash,
          transactionType: 'initial_deposit',
          amountInLamports: updated[0].depositAmount,
          durationDays: updated[0].durationDays,
        })

        return res.status(200).json({
          message: 'Transaction hash updated successfully',
          deposit: updated[0],
        })
      }

      return res.status(409).json({
        message: 'This upload has already been confirmed',
        deposit: existing[0],
      })
    }

    const depositItem: typeof uploads.$inferInsert = {
      depositAmount: depositMetadata.depositAmount,
      durationDays: depositMetadata.durationDays,
      contentCid: cid,
      depositKey: depositMetadata.depositKey,
      depositSlot: 1,
      lastClaimedSlot: 1,
      expiresAt: depositMetadata.expiresAt,
      createdAt: new Date().toISOString(),
      userEmail: depositMetadata.userEmail,
      fileName: depositMetadata.fileName,
      fileType: depositMetadata.fileType,
      fileSize: depositMetadata.fileSize,
      transactionHash: transactionHash,
      deletionStatus: 'active',
      warningSentAt: null,
    }

    const inserted = await db.insert(uploads).values(depositItem).returning()

    await saveTransaction({
      depositId: inserted[0].id,
      contentCid: cid,
      transactionHash: transactionHash,
      transactionType: 'initial_deposit',
      amountInLamports: inserted[0].depositAmount,
      durationDays: inserted[0].durationDays,
    })

    return res.status(200).json({
      message: 'Upload confirmed and saved successfully',
      deposit: inserted[0],
    })
  } catch (err) {
    Sentry.captureException(err)
    logger.error('Error confirming upload', {
      error: err instanceof Error ? err.message : String(err),
    })
    return res.status(500).json({
      message: 'Error confirming upload',
    })
  }
}
