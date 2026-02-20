import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db/db.js'
import { configTable, uploads } from '../db/schema.js'
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
import {
  getAddressTransfers,
  getUsdfcContractAddress,
} from '../services/indexer/beryx.service.js'

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
    const { totalSize, fileMap, fileArray } = fileBuilder(req.files)

    const { publicKey, duration, userEmail } = req.body
    const durationInSeconds = parseInt(duration as string, 10)
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
      email: userEmail || undefined,
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
    const durationNum = Number(duration)
    if (!Number.isFinite(durationNum)) throw new Error('Invalid duration')

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
      userEmail: userEmail || null,
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

/** the return type for fileBuilder  */
type FileMeta = {
  totalSize: number
  fileArray: Express.Multer.File[]
  fileMap: Record<string, Uint8Array>
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

  const fileMap: Record<string, Uint8Array> = {}
  let totalSize = 0

  for (const file of fileArray) {
    fileMap[file.originalname] = new Uint8Array(file.buffer)
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

    const { userAddress, duration, userEmail } = req.body
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

    const computedCID = await computeCID(fileMap)

    Sentry.setContext('fil-upload', {
      totalSize,
      fileCount: fileArray.length,
      duration: duration_days,
      cid: computedCID,
      chain: 'FIL',
    })

    Sentry.setTag('operation', 'deposit-usdfc')
    Sentry.setTag('file_count', fileArray.length)
    Sentry.setTag('payment_chain', 'fil')

    // this is a reference to what i've seen in the filecoin-pin repo.
    // javascript has another number type, apparently — BigNum/Int
    if (amountInUSDFC <= 0n)
      throw new Error(`Invalid deposit amount calculated: ${amountInUSDFC}`)

    const durationNum = Number(duration)
    if (!Number.isFinite(durationNum)) throw new Error('Invalid duration')

    const backupExpirationDate = getExpiryDate(duration_days)

    const depositMetadata = {
      depositAmount: amountInUSDFC.toString(),
      durationDays: duration_days,
      depositKey: userAddress,
      userEmail: userEmail || null,
      fileName: fileArray.length === 1 ? fileArray[0].originalname : null,
      fileType: fileArray.length === 1 ? fileArray[0].mimetype : 'directory',
      fileSize: totalSize,
      expiresAt: backupExpirationDate,
      paymentChain: 'fil',
      paymentToken: 'USDFC',
    }

    const isMainnet = process.env.NODE_ENV === 'production'
    const usdfcContractAddress = isMainnet
      ? '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045' // Filecoin mainnet
      : '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0' // Filecoin calibration

    res.status(200).json({
      message: 'Payment details ready — transfer USDFC to proceed with upload',
      cid: computedCID,
      amountUSDFC: amountInUSDFC.toString(),
      recipientAddress: config[0].filecoinWallet,
      usdfcContractAddress,
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
          verified: true,
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

/**
 * Verifies USDFC payment transaction and saves upload to database.
 * Called by SDK after user signs and broadcasts USDFC transfer transaction.
 *
 * @param req.body.cid - Content identifier of the uploaded files
 * @param req.body.transactionHash - Filecoin transaction hash of the USDFC transfer
 * @param req.body.depositMetadata - Metadata from depositUsdFC response
 * @returns Confirmation message with deposit record
 *
 * @remarks
 * Transaction verification will be implemented with indexer (see #176).
 * SDK handles file upload to Storacha separately via /upload/file(s) endpoints.
 */
export const verifyUsdFcPayment = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash, depositMetadata } = req.body

    if (!cid || !transactionHash)
      return res.status(400).json({
        message: 'The CID and transaction hash are required',
      })
    if (!depositMetadata)
      return res.status(400).json({
        message: 'Deposit metadata for this USDFC transaction is required',
      })

    const existing = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (existing.length > 0) {
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

    const config = await db.select().from(configTable)
    if (!config[0].filecoinWallet)
      throw new Error('Filecoin wallet not configured')

    const treasury = config[0].filecoinWallet
    const userAddress = depositMetadata.depositKey

    const USDFC_CONTRACT = getUsdfcContractAddress()

    const expectedAmount = BigInt(depositMetadata.depositAmount)

    /**
     * 🔁 Retry mechanism for indexing delay
     */
    let matchingTx = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const transfers = await getAddressTransfers(userAddress)

      const txMatches = transfers.filter(
        (tx) => tx.tx_hash.toLowerCase() === transactionHash.toLowerCase(),
      )

      if (txMatches.length) {
        matchingTx = txMatches.find(
          (tx) =>
            tx.from.toLowerCase() === userAddress &&
            tx.to.toLowerCase() === treasury &&
            tx.contract_address.toLowerCase() ===
              USDFC_CONTRACT.toLowerCase() &&
            BigInt(tx.amount) >= expectedAmount,
        )

        if (matchingTx) break
      }

      // wait 10 seconds before retry
      await new Promise((r) => setTimeout(r, 10000))
    }

    if (!matchingTx) {
      return res.status(200).json({
        message:
          'Valid USDFC transfer not found. Transaction may still be indexing.',
      })
    }

    const depositItem: typeof uploads.$inferInsert = {
      depositAmount: depositMetadata.depositAmount,
      durationDays: depositMetadata.durationDays,
      contentCid: cid,
      depositKey: depositMetadata.depositKey,
      depositSlot: 0,
      lastClaimedSlot: 0,
      expiresAt: depositMetadata.expiresAt,
      createdAt: new Date().toISOString(),
      userEmail: depositMetadata.userEmail,
      fileName: depositMetadata.fileName,
      fileType: depositMetadata.fileType,
      fileSize: depositMetadata.fileSize,
      transactionHash: transactionHash,
      deletionStatus: 'active',
      warningSentAt: null,
      paymentChain: 'fil',
      paymentToken: 'USDFC',
    }

    const inserted = await db.insert(uploads).values(depositItem).returning()

    await saveTransaction({
      depositId: inserted[0].id,
      contentCid: cid,
      transactionHash: transactionHash,
      transactionType: 'initial_deposit',
      amountInLamports: Number(depositMetadata.depositAmount),
      durationDays: inserted[0].durationDays,
    })

    return res.status(200).json({
      verified: true,
      message: 'USDFC payment verified and upload confirmed successfully',
      deposit: inserted[0],
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
