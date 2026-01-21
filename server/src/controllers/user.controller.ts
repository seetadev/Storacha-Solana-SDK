import * as Sentry from "@sentry/node";
import { Capabilities } from "@storacha/client/types";
import { DID } from "@ucanto/core";
import * as Delegation from "@ucanto/core/delegation";
import { Link } from "@ucanto/core/schema";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db/db.js";
import { uploads } from "../db/schema.js";
import {
  getTransactionsForCID,
  getUserHistory,
  renewStorageDuration,
  saveTransaction,
} from "../db/uploads-table.js";
import { getSolPrice } from "../services/price/sol-price.service.js";
import { QuoteOutput } from "../types/StorachaTypes.js";
import { computeCID } from "../utils/compute-cid.js";
import {
  DAY_TIME_IN_SECONDS,
  getAmountInLamportsFromUSD,
  getAmountInSOL,
  getNewStorageExpirationDate,
  ONE_BILLION_LAMPORTS,
} from "../utils/constant.js";
import { getExpiryDate } from "../utils/functions.js";
import { logger } from "../utils/logger.js";
import {
  getPricingConfig,
  getQuoteForFileUpload,
  initStorachaClient,
} from "../utils/storacha.js";
import {
  createDepositTransaction,
  createStorageRenewalTransaction,
} from "./solana.controller.js";

/**
 * Function to create UCAN delegation to grant access of a space to an agent
 * @param req
 * @param res
 * @returns
 */
export const createUCANDelegation = async (req: Request, res: Response) => {
  try {
    const { recipientDID, deadline, notBefore, baseCapabilities, fileCID } =
      req.body;
    const client = await initStorachaClient();
    const spaceDID = client.agent.did();
    const audience = DID.parse(recipientDID);
    const agent = client.agent;
    const capabilities: Capabilities = baseCapabilities.map((can: string) => ({
      with: `${spaceDID}`,
      can,
      nb: {
        root: Link.parse(fileCID),
      },
    }));

    const ucan = await Delegation.delegate({
      issuer: agent.issuer,
      audience,
      expiration: Number(deadline),
      notBefore: Number(notBefore),
      capabilities,
    });

    const archive = await ucan.archive();
    if (!archive.ok) {
      throw new Error("Failed to create delegation archive");
    }

    return res.status(200).json({
      message: "Delegation created successfully",
      delegation: Buffer.from(archive.ok).toString("base64"),
    });
  } catch (err) {
    logger.error("Error creating UCAN delegation", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: "Failed to create delegation" });
  }
};

/**
 * Function to upload a file to storacha
 * @param req
 * @param res
 * @returns
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const cid = req.query.cid as string;
    if (!cid) return res.status(400).json({ message: "CID is required" });
    const files = [
      new File([file.buffer], file.originalname, { type: file.mimetype }),
    ];

    const client = await initStorachaClient();
    const uploadedCID = await client.uploadFile(files[0]);

    if (uploadedCID.toString() !== cid) {
      throw new Error(
        `CID mismatch! Precomputed: ${cid}, Uploaded: ${uploadedCID}`,
      );
    }

    const uploadObject = {
      cid: uploadedCID,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: `https://w3s.link/ipfs/${cid}/${file.originalname}`,
      uploadedAt: new Date().toISOString(),
    };

    Sentry.setContext("file-upload", {
      cid,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    res.status(200).json({
      message: "Upload successful",
      cid: uploadedCID,
      object: uploadObject,
    });
  } catch (error: any) {
    logger.error("Error uploading file to Storacha", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      message: "Error uploading file to directory",
    });
  }
};

/**
 * allows upload of multiple files or a directory to storacha
 * @param req
 * @param res
 * @returns
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files) return res.status(400).json({ message: "No files uploaded" });

    const cid = req.query.cid as string;
    if (!cid) return res.status(400).json({ message: "CID is required" });

    const fileObjects = files.map(
      (f) => new File([f.buffer], f.originalname, { type: f.mimetype }),
    );

    const client = await initStorachaClient();
    const uploadedCID = await client.uploadDirectory(fileObjects);

    if (uploadedCID.toString() !== cid)
      throw new Error(
        `CID mismatch! Computed: ${cid}, Uploaded: ${uploadedCID}`,
      );

    Sentry.setContext("multi-file-upload", {
      cid,
      fileSize: files?.reduce((acc, curr) => acc + curr.size, 0),
      fileNames: files.map((f) => f.originalname),
      mimeTypes: files.map((f) => f.mimetype),
    });
    Sentry.setTag("operation", "multi-file-upload");

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
    };

    res.status(200).json({
      message: "Upload successful",
      cid: uploadedCID,
      object: uploadObject,
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error("Error uploading files", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({ message: "Error uploading files" });
  }
};

/**
 * Builds the deposit instruction for upload transaction
 */
export const deposit = async (req: Request, res: Response) => {
  try {
    // we're handling both single file and multiple files here as opposed to previous approach
    const files = req.files as
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] };
    let fileArray: Express.Multer.File[] = [];

    if (Array.isArray(files)) {
      fileArray = files;
    } else if (files && typeof files === "object") {
      const fileField = files["file"] || files["files"];
      if (fileField && Array.isArray(fileField)) {
        fileArray = fileField;
      } else {
        return res.status(400).json({ message: "No files selected" });
      }
    } else {
      return res.status(400).json({ message: "No files selected" });
    }

    if (fileArray.length === 0) {
      return res.status(400).json({ message: "No files selected" });
    }

    const fileMap: Record<string, Uint8Array> = {};
    let totalSize = 0;

    for (const file of fileArray) {
      fileMap[file.originalname] = new Uint8Array(file.buffer);
      totalSize += file.size;
    }

    const { publicKey, duration, userEmail } = req.body;
    const durationInSeconds = parseInt(duration as string, 10);
    const { ratePerBytePerDay } = await getPricingConfig();
    const solPrice = await getSolPrice();
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS);
    const amountInLamports = getAmountInLamportsFromUSD(
      totalSize,
      ratePerBytePerDay,
      duration_days,
      solPrice,
    );

    Sentry.setUser({
      id: publicKey,
      email: userEmail || undefined,
    });

    logger.info("Deposit calculation", {
      totalSize,
      ratePerBytePerDay,
      duration_days,
      solPrice,
      amountInLamports,
    });

    const computedCID = await computeCID(fileMap);

    Sentry.setContext("upload", {
      totalSize,
      fileCount: fileArray.length,
      duration: duration_days,
      cid: computedCID,
    });

    Sentry.setTag("operation", "deposit");
    Sentry.setTag("file_count", fileArray.length);

    if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
      throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`);
    }
    const durationNum = Number(duration);
    if (!Number.isFinite(durationNum)) throw new Error("Invalid duration");

    const depositInstructions = await createDepositTransaction({
      publicKey,
      fileSize: totalSize,
      contentCID: computedCID,
      durationDays: duration_days,
      depositAmount: amountInLamports,
    });

    const backupExpirationDate = getExpiryDate(duration_days);

    const depositItem: typeof uploads.$inferInsert = {
      depositAmount: amountInLamports,
      durationDays: duration_days,
      contentCid: computedCID,
      depositKey: publicKey.toLowerCase(),
      depositSlot: 1,
      lastClaimedSlot: 1,
      expiresAt: backupExpirationDate,
      createdAt: new Date().toISOString(),
      userEmail: userEmail || null,
      fileName: fileArray.length === 1 ? fileArray[0].originalname : null,
      fileType: fileArray.length === 1 ? fileArray[0].mimetype : "directory",
      fileSize: totalSize,
      // for now the hash isn't available to us. once confirmation happens,
      // the column will be updated with the confirmed hash
      transactionHash: null,
      deletionStatus: "active",
      warningSentAt: null,
    };

    await db.insert(uploads).values(depositItem).returning();

    res.status(200).json({
      message: "Deposit instruction ready — sign to finalize upload",
      cid: computedCID,
      instructions: depositInstructions,
      fileCount: fileArray.length,
      totalSize: totalSize,
      files: fileArray.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
      })),
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error("Error making a deposit", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      message: "Error making a deposit",
    });
  }
};

/**
 * Function to get Quote For File Upload
 * @param req Request
 * @param res Response
 * @returns quoteObject || null and success
 */
export const GetQuoteForFileUpload = async (req: Request, res: Response) => {
  try {
    const duration = parseInt(req.query.duration as string, 10);
    const size = parseInt(req.query.size as string, 10);
    const QuoteObject: QuoteOutput = await getQuoteForFileUpload({
      durationInUnits: duration,
      sizeInBytes: size,
    });
    return res.status(200).json({
      quote: QuoteObject,
      success: true,
    });
  } catch (err) {
    logger.error("Error getting upload quote", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(400).json({
      quoteObject: null,
      success: false,
    });
  }
};

/**
 * Function to get user upload history
 * @param req
 * @param res
 * @returns
 */
export const GetUserUploadHistory = async (req: Request, res: Response) => {
  try {
    const userAddress = req.query.userAddress as string;
    if (userAddress === null || userAddress === undefined) {
      return res.status(400).json({
        message: "Error getting the user address from the params",
      });
    }
    const userHistory = await getUserHistory(userAddress);
    return res.status(200).json({
      userHistory: userHistory,
      userAddress: userAddress,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Error getting the user history",
    });
  }
};

/**
 * Function to update transaction hash after transaction is confirmed
 * @param req
 * @param res
 * @returns
 */
export const updateTransactionHash = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash } = req.body;

    if (!cid || !transactionHash) {
      return res.status(400).json({
        message: "CID and transaction hash are required",
      });
    }

    const updated = await db
      .update(uploads)
      .set({ transactionHash: transactionHash })
      .where(eq(uploads.contentCid, cid))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({
        message: "Deposit not found for the given CID",
      });
    }

    await saveTransaction({
      depositId: updated[0].id,
      contentCid: cid,
      transactionHash: transactionHash,
      transactionType: "initial_deposit",
      amountInLamports: updated[0].depositAmount,
      durationDays: updated[0].durationDays,
    });

    return res.status(200).json({
      message: "Transaction hash updated successfully",
      deposit: updated[0],
    });
  } catch (err) {
    logger.error("Error updating transaction hash", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({
      message: "Error updating transaction hash",
    });
  }
};

/**
 * Get what it'll cost for a storage renewal
 */
export const getStorageRenewalCost = async (req: Request, res: Response) => {
  try {
    const { cid, duration } = req.query;
    if (!cid || !duration) {
      return res.status(400).json({
        message: "CID and the new duartion are required",
      });
    }

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid as string))
      .limit(1);

    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: "There's no upload for this CID",
      });
    }

    const deposit = deposits[0];
    const fileSizeInBytes = deposit.fileSize || 0;
    const days = parseInt(duration as string, 10);

    const { ratePerBytePerDay } = await getPricingConfig();
    const solPrice = await getSolPrice();
    const totalLamports = getAmountInLamportsFromUSD(
      fileSizeInBytes,
      ratePerBytePerDay,
      days,
      solPrice,
    );

    const newExpirationDate = getNewStorageExpirationDate(
      String(deposit.expiresAt),
      Number(duration),
    );

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
    });
  } catch (error) {
    logger.error("Error retrieving storage renewal cost", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      message: "Failed to get renewal cost",
    });
  }
};

/**
 * Initiate payment for storage renewal
 */
export const renewStorage = async (req: Request, res: Response) => {
  try {
    const { cid, duration, publicKey } = req.body;

    if (!cid || !duration || !publicKey) {
      return res.status(400).json({
        message: "The duration, CID, and publicKey are required",
      });
    }

    const deposits = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1);
    if (!deposits || deposits.length === 0) {
      return res.status(404).json({
        message: "Upload not available",
      });
    }

    const deposit = deposits[0];
    if (deposit.deletionStatus === "deleted") {
      return res.status(400).json({
        message:
          "You can't renew storage for an upload that has already been removed on IPFS",
      });
    }

    const days = parseInt(duration, 10);
    const { ratePerBytePerDay } = await getPricingConfig();
    const solPrice = await getSolPrice();
    const amountInLamports = getAmountInLamportsFromUSD(
      Number(deposit.fileSize),
      ratePerBytePerDay,
      days,
      solPrice,
    );

    const storageRenewalIx = await createStorageRenewalTransaction({
      publicKey,
      durationDays: days,
      contentCID: cid,
      extensionCost: amountInLamports,
    });

    Sentry.setUser({ id: publicKey });
    Sentry.setContext("storage-renewal", {
      cid,
      duration,
      fileSize: deposit.fileSize,
    });
    Sentry.setTag("operation", "storage-renewal");

    return res.status(200).json({
      cid,
      message: "Storage renewal instruction is ready. Sign it",
      instructions: storageRenewalIx,
      duration: days,
      cost: {
        lamports: amountInLamports,
        sol: getAmountInSOL(amountInLamports),
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error("Error making storage renewal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      message: "Failed to renew storage duration",
    });
  }
};

/**
 * Confirm storage duration renewal
 */
export const confirmStorageRenewal = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash, duration } = req.body;

    if (!cid || !transactionHash || !duration)
      return res.status(400).json({
        message: "CID, transactionHash, and duration are required",
      });

    const updated = await renewStorageDuration(cid, parseInt(duration, 10));

    if (!updated)
      return res.status(404).json({
        message: "Failed to update storage duration",
      });

    const days = parseInt(duration, 10);
    const { ratePerBytePerDay } = await getPricingConfig();
    const solPrice = await getSolPrice();
    const amountInLamports = getAmountInLamportsFromUSD(
      Number(updated.fileSize),
      ratePerBytePerDay,
      days,
      solPrice,
    );

    // Add renewal transaction to audit trail
    await saveTransaction({
      depositId: updated.id,
      contentCid: cid,
      transactionHash: transactionHash,
      transactionType: "renewal",
      amountInLamports: amountInLamports,
      durationDays: days,
    });

    return res.status(200).json({
      message: "Storage renewed successfully",
      deposit: updated,
    });
  } catch (error) {
    logger.error("Error confirming renewal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      message: "Failed to confirm renewal",
    });
  }
};

/**
 * Get all transactions for a specific upload (by CID)
 */
export const getUploadTransactions = async (req: Request, res: Response) => {
  try {
    const { cid } = req.query;
    if (!cid) return res.status(400).json({ message: "CID is required" });

    const transactions = await getTransactionsForCID(cid as string);
    if (!transactions)
      return res.status(404).json({ message: "No transactions found" });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    logger.error("Error fetching transaction history", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

export const getSolUsdPrice = async (_req: Request, res: Response) => {
  try {
    const price = await getSolPrice();
    return res.status(200).json({
      price,
      timestamp: Date.now,
    });
  } catch (error) {
    logger.error("Error getting SOL/USD price", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: "Failed to get SOL/USD price" });
  }
};
