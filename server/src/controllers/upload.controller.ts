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
import { verifyPptPayment } from '../services/ppt/verify.service.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { PaginationContext } from '../types.js'
import {
  DAY_TIME_IN_SECONDS,
  getAmountInLamportsFromUSD,
} from '../utils/constant.js'
import { getExpiryDate, getPaginationParams } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import {
  PPT_FEE_AMOUNT,
  PPT_PAYMENT_CHAIN,
  PPT_PAYMENT_TOKEN,
  PPT_TOKEN_ADDRESS,
  getPptTreasury,
} from '../utils/ppt/constants.js'
import { getPricingConfig } from '../utils/pricing.js'
import {
  gatewayUrl,
  pinFiles,
  retrieveFile,
} from '../services/storage/meshkit.service.js'

/** Extract optional per-request Kubo node overrides from headers. */
function extractNodeHeaders(req: {
  headers: Record<string, string | string[] | undefined>
}) {
  const nodeUrl = req.headers['x-kubo-node-url'] as string | undefined
  const gatewayBase = req.headers['x-ipfs-gateway-url'] as string | undefined
  return { nodeUrl, gatewayBase }
}

/**
 * Require a verified 1 PPT transfer on Arbitrum Sepolia before MeshKit IO.
 * Accepts tx hash + payer from body fields or X-PPT-Tx-Hash / X-User-Address headers.
 */
async function requirePptPayment(
  req: Request,
): Promise<
  | { ok: true; txHash: string; payer: string }
  | { ok: false; status: number; message: string }
> {
  const body = (req.body ?? {}) as Record<string, unknown>
  const headerTx = req.headers['x-ppt-tx-hash']
  const headerPayer = req.headers['x-user-address']
  const queryTx =
    typeof req.query.txHash === 'string' ? req.query.txHash : undefined
  const queryPayer =
    typeof req.query.userAddress === 'string'
      ? req.query.userAddress
      : undefined

  const txHash = String(
    body.transactionHash ?? body.txHash ?? headerTx ?? queryTx ?? '',
  ).trim()
  const payer = String(body.userAddress ?? headerPayer ?? queryPayer ?? '')
    .trim()
    .toLowerCase()

  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return {
      ok: false,
      status: 402,
      message:
        'PPT payment required: provide transactionHash of a 1 PPT transfer on Arbitrum Sepolia',
    }
  }

  if (!payer || !/^0x[a-f0-9]{40}$/.test(payer)) {
    return {
      ok: false,
      status: 400,
      message: 'userAddress (0x…) that paid the PPT fee is required',
    }
  }

  const [existing] = await db
    .select({ id: uploads.id })
    .from(uploads)
    .where(eq(uploads.transactionHash, txHash))
    .limit(1)

  if (existing) {
    return {
      ok: false,
      status: 409,
      message: 'This PPT transaction was already used',
    }
  }

  const { verified, reason } = await verifyPptPayment({
    transactionHash: txHash,
    from: payer,
    to: getPptTreasury(),
    expectedAmount: PPT_FEE_AMOUNT,
  })

  if (!verified) {
    return {
      ok: false,
      status: 402,
      message: `PPT payment verification failed${reason ? `: ${reason}` : ''}`,
    }
  }

  return { ok: true, txHash, payer }
}

/** Public PPT gate config for the UI. */
export const getPptConfig = async (_req: Request, res: Response) => {
  return res.status(200).json({
    tokenAddress: PPT_TOKEN_ADDRESS,
    treasury: getPptTreasury(),
    chainId: 421614,
    network: 'arbitrumSepolia',
    feeAmount: PPT_FEE_AMOUNT.toString(),
    feeLabel: '1 PPT',
    decimals: 18,
    explorer: 'https://sepolia.arbiscan.io',
  })
}
import { createDepositTransaction } from './solana.controller.js'

const MIN_DURATION_SECONDS = DAY_TIME_IN_SECONDS // 1 day
// email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Function to pin a file to IPFS via the local Kubo node (meshkit)
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })

    const { nodeUrl, gatewayBase } = extractNodeHeaders(req)

    const { primaryCid: pinnedCID } = await pinFiles(
      {
        [file.originalname]: {
          buffer: new Uint8Array(file.buffer),
          mimetype: file.mimetype,
        },
      },
      file.originalname,
      nodeUrl,
    )

    if (pinnedCID !== cid) {
      logger.warn('CID mismatch between pre-computed and pinned', {
        precomputed: cid,
        pinned: pinnedCID,
      })
    }

    Sentry.setContext('file-upload', {
      cid: pinnedCID,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    })

    res.status(200).json({
      message: 'Upload successful',
      cid: pinnedCID,
      object: {
        cid: pinnedCID,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: gatewayUrl(pinnedCID, file.originalname, gatewayBase, nodeUrl),
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
 * Pins multiple files or a directory to IPFS via the local Kubo node (meshkit)
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]

    if (!files) return res.status(400).json({ message: 'No files uploaded' })

    const cid = req.query.cid as string
    if (!cid) return res.status(400).json({ message: 'CID is required' })

    const { nodeUrl, gatewayBase } = extractNodeHeaders(req)

    const fileMap: Record<string, { buffer: Uint8Array; mimetype: string }> = {}
    for (const f of files) {
      fileMap[f.originalname] = {
        buffer: new Uint8Array(f.buffer),
        mimetype: f.mimetype,
      }
    }

    const { primaryCid: pinnedCID, files: pinnedFiles } = await pinFiles(
      fileMap,
      `directory-${crypto.randomUUID()}`,
      nodeUrl,
    )

    if (pinnedCID !== cid)
      logger.warn('CID mismatch between pre-computed and pinned', {
        precomputed: cid,
        pinned: pinnedCID,
      })

    Sentry.setContext('multi-file-upload', {
      cid: pinnedCID,
      fileSize: files?.reduce((acc, curr) => acc + curr.size, 0),
      fileNames: files.map((f) => f.originalname),
      mimeTypes: files.map((f) => f.mimetype),
    })
    Sentry.setTag('operation', 'multi-file-upload')

    res.status(200).json({
      message: 'Upload successful',
      cid: pinnedCID,
      object: {
        cid: pinnedCID,
        url: gatewayUrl(pinnedCID, undefined, gatewayBase, nodeUrl),
        size: files.reduce((sum, f) => sum + f.size, 0),
        files: pinnedFiles.map((f) => ({
          filename: f.name,
          size: fileMap[f.name]?.buffer.byteLength ?? 0,
          type: f.mimetype,
          cid: f.cid,
          url: gatewayUrl(f.cid, f.name, gatewayBase, nodeUrl),
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
    const { nodeUrl, gatewayBase } = extractNodeHeaders(req)

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

    const { primaryCid: pinnedCID } = await pinFiles(
      fileMap,
      fileArray.length === 1
        ? fileArray[0].originalname
        : directoryName || `dir-${Date.now()}`,
      nodeUrl,
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
        kuboNodeUrl: nodeUrl || null,
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
    const { nodeUrl } = extractNodeHeaders(req)
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

    const { primaryCid: pinnedCID } = await pinFiles(
      fileMap,
      fileArray.length === 1
        ? fileArray[0].originalname
        : directoryName || `dir-${Date.now()}`,
      nodeUrl,
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
        kuboNodeUrl: nodeUrl || null,
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
 * The file is already pinned on the local Kubo node from the deposit step.
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
      undefined,
      confirmedUpload.kuboNodeUrl ?? undefined,
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
 * SDK handles file pinning to IPFS via the local Kubo node via /upload/file(s) endpoints.
 */
/**
 * Verifies USDFC payment transaction and marks the pending upload as confirmed.
 * The file is already pinned on the local Kubo node from the deposit step.
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

/**
 * MeshKit upload — pin files after a verified 1 PPT payment on Arbitrum Sepolia.
 *
 * Body:  userAddress   (required) — EVM wallet that paid
 *        transactionHash / txHash (required) — PPT transfer tx
 *        encryptPassword (optional) — MeshKit AES-256-GCM encrypt-on-upload
 *        userEmail     (optional)
 *        directoryName (optional)
 * Files: file (multipart, one or many)
 * Headers: X-Kubo-Node-URL / X-IPFS-Gateway-URL (optional)
 *
 * Each file is uploaded+pinned via meshkit.upload/pin and stored as its own
 * CID row so retrieve works per file.
 */
export const uploadMeshkit = async (req: Request, res: Response) => {
  try {
    const payment = await requirePptPayment(req)
    if (!payment.ok) {
      return res.status(payment.status).json({ message: payment.message })
    }

    const { totalSize, fileMap, fileArray } = fileBuilder(req.files)
    const { userEmail, directoryName, encryptPassword } = req.body
    const { nodeUrl, gatewayBase } = extractNodeHeaders(req)

    // deposit_key is varchar(44) — EVM addresses are 42 chars
    const depositKey = payment.payer.slice(0, 44)

    const dirLabel =
      fileArray.length === 1
        ? fileArray[0].originalname
        : directoryName || `dir-${Date.now()}`

    const { primaryCid, files: pinnedFiles } = await pinFiles(
      fileMap,
      dirLabel,
      nodeUrl,
      typeof encryptPassword === 'string' && encryptPassword.length > 0
        ? encryptPassword
        : undefined,
    )

    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    const expiresAt = oneYearFromNow.toISOString().split('T')[0]
    // uploads.created_at is a SQL date, not a timestamp. A full ISO string
    // is rejected and the row never lands, so history stays empty.
    const createdAt = new Date().toISOString().split('T')[0]

    const responseFiles = []

    for (const pinned of pinnedFiles) {
      const original = fileArray.find((f) => f.originalname === pinned.name)
      const size =
        original?.size ?? fileMap[pinned.name]?.buffer.byteLength ?? 0

      await db.insert(uploads).values({
        depositAmount: 1, // 1 PPT per upload operation
        durationDays: 365,
        contentCid: pinned.cid,
        depositKey,
        depositSlot: 0,
        lastClaimedSlot: 0,
        expiresAt,
        createdAt,
        userEmail: userEmail || null,
        fileName: pinned.name,
        fileType: pinned.mimetype,
        fileSize: size,
        // Only the first file row stores the tx hash (replay lock); siblings share op via payer
        transactionHash:
          pinned === pinnedFiles[0]
            ? payment.txHash
            : `${payment.txHash}:${pinned.cid.slice(0, 8)}`,
        deletionStatus: 'active',
        warningSentAt: null,
        paymentChain: PPT_PAYMENT_CHAIN,
        paymentToken: PPT_PAYMENT_TOKEN,
        kuboNodeUrl: nodeUrl || null,
      })

      responseFiles.push({
        name: pinned.name,
        size,
        type: pinned.mimetype,
        cid: pinned.cid,
        url: gatewayUrl(pinned.cid, pinned.name, gatewayBase, nodeUrl),
        retrieveUrl: `/upload/retrieve/${encodeURIComponent(pinned.cid)}`,
      })
    }

    Sentry.setContext('meshkit-upload', {
      cid: primaryCid,
      userAddress: depositKey,
      fileCount: pinnedFiles.length,
      totalSize,
      encrypted: Boolean(encryptPassword),
      pptTx: payment.txHash,
    })

    logger.info('MeshKit upload complete (PPT gated)', {
      cid: primaryCid,
      userAddress: depositKey,
      fileCount: pinnedFiles.length,
      totalSize,
      nodeUrl,
      pptTx: payment.txHash,
    })

    return res.status(200).json({
      message: 'Files uploaded and pinned via MeshKit (1 PPT paid)',
      cid: primaryCid,
      url: gatewayUrl(
        primaryCid,
        pinnedFiles.length === 1 ? pinnedFiles[0].name : undefined,
        gatewayBase,
        nodeUrl,
      ),
      files: responseFiles,
      totalSize,
      encrypted: Boolean(encryptPassword),
      uploadedAt: createdAt,
      payment: {
        token: PPT_PAYMENT_TOKEN,
        chain: PPT_PAYMENT_CHAIN,
        amount: PPT_FEE_AMOUNT.toString(),
        transactionHash: payment.txHash,
      },
    })
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error in MeshKit upload', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      message: 'Upload failed',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/** @deprecated Use uploadMeshkit — kept as alias for older Sepolia UI path */
export const uploadSepolia = uploadMeshkit

/**
 * Retrieve file bytes by CID via meshkit.retrieve().
 * Requires a fresh 1 PPT payment (txHash + userAddress via query or headers).
 *
 * GET /upload/retrieve/:cid
 * Query: password (optional), txHash, userAddress
 * Headers: X-PPT-Tx-Hash, X-User-Address, X-Kubo-Node-URL (optional)
 */
export const retrieveMeshkit = async (req: Request, res: Response) => {
  try {
    const cid = req.params.cid as string
    if (!cid) {
      return res.status(400).json({ message: 'CID is required' })
    }

    const payment = await requirePptPayment(req)
    if (!payment.ok) {
      return res.status(payment.status).json({ message: payment.message })
    }

    const { nodeUrl } = extractNodeHeaders(req)
    const password =
      typeof req.query.password === 'string' && req.query.password.length > 0
        ? req.query.password
        : undefined

    // Prefer the Kubo node recorded at upload time when no override is sent
    let resolvedNode = nodeUrl
    if (!resolvedNode) {
      const [record] = await db
        .select()
        .from(uploads)
        .where(eq(uploads.contentCid, cid))
        .limit(1)
      resolvedNode = record?.kuboNodeUrl ?? undefined
    }

    const [meta] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    const bytes = await retrieveFile(cid, resolvedNode, password)
    const filename = meta?.fileName || 'download'
    const mimetype = meta?.fileType || 'application/octet-stream'

    // Consume the PPT tx so it cannot be replayed.
    // created_at / expires_at are SQL dates.
    const createdAt = new Date().toISOString().split('T')[0]
    await db.insert(uploads).values({
      depositAmount: 1, // 1 PPT per retrieve operation
      durationDays: 0,
      contentCid: cid,
      depositKey: payment.payer.slice(0, 44),
      depositSlot: 0,
      lastClaimedSlot: 0,
      expiresAt: createdAt,
      createdAt,
      userEmail: null,
      fileName: `retrieve:${filename}`,
      fileType: mimetype,
      fileSize: bytes.byteLength,
      transactionHash: payment.txHash,
      deletionStatus: 'active',
      warningSentAt: null,
      paymentChain: PPT_PAYMENT_CHAIN,
      paymentToken: PPT_PAYMENT_TOKEN,
      kuboNodeUrl: resolvedNode || null,
    })

    res.setHeader('Content-Type', mimetype)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    )
    res.setHeader('X-IPFS-CID', cid)
    res.setHeader('X-PPT-Tx-Hash', payment.txHash)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    return res.status(200).send(Buffer.from(bytes))
  } catch (error) {
    Sentry.captureException(error)
    logger.error('Error retrieving via MeshKit', {
      error: error instanceof Error ? error.message : String(error),
      cid: req.params.cid,
    })
    return res.status(404).json({
      message: 'Failed to retrieve file',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
