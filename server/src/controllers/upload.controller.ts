import * as Sentry from '@sentry/node'
import { PublicKey } from '@solana/web3.js'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { configTable, uploads } from '../db/schema.js'
import { getUserHistory, saveTransaction } from '../db/uploads.js'
import {
  getUsdfcContractAddress,
  verifyErc20Transfer,
} from '../services/fil/verify.service.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { PaginationContext } from '../types.js'
import {
  DAY_TIME_IN_SECONDS,
  getAmountInLamportsFromUSD,
} from '../utils/constant.js'
import { getExpiryDate, getPaginationParams } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'
import { gatewayUrl, pinFiles } from '../services/storage/pinata.service.js'
import { createDepositTransaction } from './solana.controller.js'

const MIN_DURATION_SECONDS = DAY_TIME_IN_SECONDS // 1 day
// email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Function to pin a file to IPFS via Pinata
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })

    const pinnedCID = await pinFiles(
      {
        [file.originalname]: {
          buffer: new Uint8Array(file.buffer),
          mimetype: file.mimetype,
        },
      },
      file.originalname,
    )

    if (pinnedCID !== cid) {
      logger.warn('CID mismatch between pre-computed and pinned', {
        precomputed: cid,
        pinned: pinnedCID,
      })
    }

    Sentry.setContext('file-upload', {
      cid: cid,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    })

    res.status(200).json({
      message: 'Upload successful',
      cid: cid,
      object: {
        cid: cid,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: gatewayUrl(cid, file.originalname),
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    Sentry.captureException(error)
    logger.error('Error uploading file', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause: error?.cause,
    })
    res.status(400).json({
      message: 'Error uploading file',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Pins multiple files or a directory to IPFS via Pinata
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]

    if (!files) return res.status(400).json({ message: 'No files uploaded' })

    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })

    const fileMap: Record<string, { buffer: Uint8Array; mimetype: string }> = {}
    for (const f of files) {
      fileMap[f.originalname] = {
        buffer: new Uint8Array(f.buffer),
        mimetype: f.mimetype,
      }
    }

    const pinnedCID = await pinFiles(
      fileMap,
      `directory-${crypto.randomUUID()}`,
    )

    if (pinnedCID !== cid)
      logger.warn('CID mismatch between pre-computed and pinned', {
        precomputed: cid,
        pinned: pinnedCID,
      })

    Sentry.setContext('multi-file-upload', {
      cid,
      fileSize: files?.reduce((acc, curr) => acc + curr.size, 0),
      fileNames: files.map((f) => f.originalname),
      mimeTypes: files.map((f) => f.mimetype),
    })
    Sentry.setTag('operation', 'multi-file-upload')

    res.status(200).json({
      message: 'Upload successful',
      cid,
      object: {
        cid,
        url: gatewayUrl(cid),
        size: files.reduce((sum, f) => sum + f.size, 0),
        files: files.map((f) => ({
          filename: f.originalname,
          size: f.size,
          type: f.mimetype,
          url: gatewayUrl(cid, f.originalname),
        })),
        uploadedAt: new Date().toISOString(),
      },
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
    const { totalSize, fileMap, fileArray } = fileBuilder(req.files)

    const { publicKey, duration, userEmail, directoryName } = req.body

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

    const pinnedCID = await pinFiles(
      fileMap,
      fileArray.length === 1
        ? fileArray[0].originalname
        : directoryName || `dir-${Date.now()}`,
    )

    const existingUpload = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, pinnedCID))
      .limit(1)

    if (existingUpload.length > 0 && existingUpload[0].transactionHash)
      return res.status(409).json({
        message: 'This file has already been uploaded',
        cid: existingUpload[0].contentCid,
        expiresAt: existingUpload[0].expiresAt,
      })

    Sentry.setContext('upload', {
      totalSize,
      fileCount: fileArray.length,
      duration: duration_days,
      cid: pinnedCID,
    })

    Sentry.setTag('operation', 'deposit')
    Sentry.setTag('file_count', fileArray.length)

    if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
      throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`)
    }

    const expiresAt = getExpiryDate(duration_days)
    const fileName =
      fileArray.length === 1 ? fileArray[0].originalname : directoryName || null
    const fileType =
      fileArray.length === 1 ? fileArray[0].mimetype : 'directory'

    if (existingUpload.length === 0) {
      await db.insert(uploads).values({
        depositAmount: amountInLamports,
        durationDays: duration_days,
        contentCid: pinnedCID,
        depositKey: publicKey,
        depositSlot: 1,
        lastClaimedSlot: 1,
        expiresAt,
        createdAt: new Date().toISOString(),
        userEmail: sanitizedEmail || null,
        fileName,
        fileType,
        fileSize: totalSize,
        transactionHash: null,
        deletionStatus: 'pending',
        warningSentAt: null,
        paymentChain: 'sol',
        paymentToken: 'SOL',
      })
    } else {
      // pending record exists — refresh metadata in case user retries with updated params
      await db
        .update(uploads)
        .set({
          depositAmount: amountInLamports,
          durationDays: duration_days,
          depositKey: publicKey,
          expiresAt,
          userEmail: sanitizedEmail || null,
          fileName,
          fileType,
          fileSize: totalSize,
          deletionStatus: 'pending',
        })
        .where(eq(uploads.contentCid, pinnedCID))
    }

    const depositInstructions = await createDepositTransaction({
      publicKey,
      fileSize: totalSize,
      contentCID: pinnedCID,
      durationDays: duration_days,
      depositAmount: amountInLamports,
    })

    res.status(200).json({
      message: 'Deposit instruction ready — sign to finalize upload',
      cid: pinnedCID,
      instructions: depositInstructions,
      fileCount: fileArray.length,
      totalSize,
      files: fileArray.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
      })),
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

/** the return type for fileBuilder  */
type FileMeta = {
  totalSize: number
  fileArray: Express.Multer.File[]
  fileMap: Record<string, { buffer: Uint8Array; mimetype: string }>
}

/**
 * Processes uploaded files from multer into a file map and calculates total size
 * Handles both single file and multiple file uploads
 *
 * @param files - Multer files (array or object with file fields)
 * @returns `FileMeta` containing fileMap (filename -> buffer), totalSize in bytes, and fileArray
 * @throws Error if no files are provided
 */
const fileBuilder = (
  files:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined,
): FileMeta => {
  let fileArray: Express.Multer.File[] = []

  if (Array.isArray(files)) {
    fileArray = files
  } else if (files && typeof files === 'object') {
    const fileField = files.file || files.files
    if (fileField && Array.isArray(fileField)) {
      fileArray = fileField
    } else {
      throw new Error('No files selected')
    }
  } else {
    throw new Error('No files selected')
  }

  if (fileArray.length === 0) throw new Error('No files selected')

  const fileMap: Record<string, { buffer: Uint8Array; mimetype: string }> = {}
  let totalSize = 0

  for (const file of fileArray) {
    fileMap[file.originalname] = {
      buffer: new Uint8Array(file.buffer),
      mimetype: file.mimetype,
    }
    totalSize += file.size
  }

  return {
    fileMap,
    totalSize,
    fileArray,
  }
}

/**
 * Builds the USDFC payment metadata for upload transaction.
 */
export const depositUsdFC = async (req: Request, res: Response) => {
  try {
    const { totalSize, fileMap, fileArray } = fileBuilder(req.files)

    const { userAddress, duration, userEmail, directoryName } = req.body
    const durationInSeconds = parseInt(duration as string, 10)
    const config = await db.select().from(configTable)
    const { ratePerBytePerDay } = await getPricingConfig()
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS)

    if (!config[0].filecoinWallet) {
      throw new Error('Filecoin wallet not configured')
    }

    const costUSD = totalSize * ratePerBytePerDay * duration_days

    // USDFC uses 18 decimals (standard ERC-20)
    // contract: 0x80B98d3aa09ffff255c3ba4A241111Ff1262F045
    const amountInUSDFC = BigInt(Math.floor(costUSD * 1e18))

    Sentry.setUser({
      id: userAddress,
      email: userEmail || undefined,
    })

    logger.info('USDFC deposit calculation', {
      totalSize,
      ratePerBytePerDay,
      duration_days,
      costUSD,
      amountInUSDFC: amountInUSDFC.toString(),
    })

    // this is a reference to what i've seen in the filecoin-pin repo.
    // javascript has another number type, apparently — BigNum/Int
    if (amountInUSDFC <= 0n)
      throw new Error(`Invalid deposit amount calculated: ${amountInUSDFC}`)

    const durationNum = Number(duration)
    if (!Number.isFinite(durationNum)) throw new Error('Invalid duration')

    const pinnedCID = await pinFiles(
      fileMap,
      fileArray.length === 1
        ? fileArray[0].originalname
        : directoryName || `dir-${Date.now()}`,
    )

    const existingUpload = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, pinnedCID))
      .limit(1)

    if (existingUpload.length > 0 && existingUpload[0].transactionHash)
      return res.status(409).json({
        message: 'This file has already been uploaded',
        cid: existingUpload[0].contentCid,
        expiresAt: existingUpload[0].expiresAt,
      })

    Sentry.setContext('fil-upload', {
      totalSize,
      fileCount: fileArray.length,
      duration: duration_days,
      cid: pinnedCID,
      chain: 'FIL',
    })

    Sentry.setTag('operation', 'deposit-usdfc')
    Sentry.setTag('file_count', fileArray.length)
    Sentry.setTag('payment_chain', 'fil')

    const expiresAt = getExpiryDate(duration_days)
    const fileName =
      fileArray.length === 1 ? fileArray[0].originalname : directoryName || null
    const fileType =
      fileArray.length === 1 ? fileArray[0].mimetype : 'directory'

    if (existingUpload.length === 0) {
      await db.insert(uploads).values({
        depositAmount: Number(amountInUSDFC),
        durationDays: duration_days,
        contentCid: pinnedCID,
        depositKey: userAddress,
        depositSlot: 0,
        lastClaimedSlot: 0,
        expiresAt,
        createdAt: new Date().toISOString(),
        userEmail: userEmail || null,
        fileName,
        fileType,
        fileSize: totalSize,
        transactionHash: null,
        deletionStatus: 'pending',
        warningSentAt: null,
        paymentChain: 'fil',
        paymentToken: 'USDFC',
      })
    } else {
      // pending record exists — refresh metadata in case user retries with updated params
      await db
        .update(uploads)
        .set({
          depositAmount: Number(amountInUSDFC),
          durationDays: duration_days,
          depositKey: userAddress,
          expiresAt,
          userEmail: userEmail || null,
          fileName,
          fileType,
          fileSize: totalSize,
          deletionStatus: 'pending',
        })
        .where(eq(uploads.contentCid, pinnedCID))
    }

    const isMainnet = process.env.NODE_ENV === 'production'
    const usdfcContractAddress = isMainnet
      ? '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045' // Filecoin mainnet
      : '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0' // Filecoin calibration

    res.status(200).json({
      message: 'Payment details ready — transfer USDFC to proceed with upload',
      cid: pinnedCID,
      amountUSDFC: amountInUSDFC.toString(),
      recipientAddress: config[0].filecoinWallet,
      usdfcContractAddress,
      fileCount: fileArray.length,
      totalSize,
      files: fileArray.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
      })),
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error making USDFC deposit', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(400).json({
      message: 'Error making USDFC deposit',
    })
  }
}

/**
 * Function to get user upload history (paginated)
 */
export const getUploadHistory = async (req: Request, res: Response) => {
  try {
    const userAddress = req.query.userAddress as string
    const chain = (req.query.chain as string) || 'sol'

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
      chain,
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
 * Marks a pending upload as confirmed after the Solana transaction is verified.
 * The file is already pinned on Pinata from the deposit step.
 */
export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash } = req.body

    if (!cid || !transactionHash) {
      return res.status(400).json({
        message: 'CID and transaction hash are required',
      })
    }

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (existing.length === 0)
      return res.status(404).json({
        message: 'No pending upload found for this CID',
      })

    if (existing[0].transactionHash)
      return res.status(409).json({
        message: 'This upload has already been confirmed',
        deposit: existing[0],
      })

    const [confirmedUpload] = await db
      .update(uploads)
      .set({ transactionHash, deletionStatus: 'active' })
      .where(eq(uploads.contentCid, cid))
      .returning()

    await saveTransaction({
      depositId: confirmedUpload.id,
      contentCid: cid,
      transactionHash,
      transactionType: 'initial_deposit',
      amountInLamports: confirmedUpload.depositAmount,
      durationDays: confirmedUpload.durationDays,
    })

    const url = gatewayUrl(
      cid,
      confirmedUpload.fileType === 'directory'
        ? undefined
        : (confirmedUpload.fileName ?? undefined),
    )

    return res.status(200).json({
      verified: true,
      message: 'Upload confirmed successfully',
      deposit: confirmedUpload,
      url,
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

/**
 * Verifies USDFC payment transaction and saves upload to database.
 * Called by SDK after user signs and broadcasts USDFC transfer transaction.
 *
 * @param req.body.cid - Content identifier of the uploaded files
 * @param req.body.transactionHash - Filecoin transaction hash of the USDFC transfer
 * @returns Confirmation message with deposit record
 *
 * @remarks
 * Transaction verification will be implemented with indexer (see #176).
 * SDK handles file pinning to IPFS via Pinata via /upload/file(s) endpoints.
 */
/**
 * Verifies USDFC payment transaction and marks the pending upload as confirmed.
 * The file is already pinned on Pinata from the deposit step.
 */
export const verifyUsdFcPayment = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash } = req.body

    if (!cid || !transactionHash)
      return res.status(400).json({
        message: 'The CID and transaction hash are required',
      })

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (existing.length === 0)
      return res.status(404).json({
        message: 'No pending upload found for this CID',
      })

    if (existing[0].transactionHash)
      return res.status(409).json({
        message: 'This upload has already been confirmed',
        deposit: existing[0],
      })

    const config = await db.select().from(configTable)
    if (!config[0].filecoinWallet)
      throw new Error('Filecoin wallet not configured')

    const { verified } = await verifyErc20Transfer({
      transactionHash,
      from: existing[0].depositKey,
      to: config[0].filecoinWallet,
      contractAddress: getUsdfcContractAddress(),
      expectedAmount: BigInt(existing[0].depositAmount),
    })

    if (!verified)
      return res.status(400).json({
        message:
          'USDFC transfer verification failed. Transaction may not exist, may have failed, or the amount/recipient does not match.',
      })

    const [confirmedUpload] = await db
      .update(uploads)
      .set({ transactionHash, deletionStatus: 'active' })
      .where(eq(uploads.contentCid, cid))
      .returning()

    await saveTransaction({
      depositId: confirmedUpload.id,
      contentCid: cid,
      transactionHash,
      transactionType: 'initial_deposit',
      amountInLamports: confirmedUpload.depositAmount,
      durationDays: confirmedUpload.durationDays,
    })

    return res.status(200).json({
      verified: true,
      message: 'USDFC payment verified and upload confirmed successfully',
      deposit: confirmedUpload,
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error verifying USDFC payment', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Error verifying USDFC payment',
    })
  }
}
