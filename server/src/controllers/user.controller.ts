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
  renewStorageDuration,
  saveTransaction,
} from "../db/uploads-table.js";
import { getSolPrice } from "../services/price/sol-price.service.js";
import { QuoteOutput } from "../types/StorachaTypes.js";
import {
  getAmountInLamportsFromUSD,
  getAmountInSOL,
  getNewStorageExpirationDate,
  ONE_BILLION_LAMPORTS,
} from "../utils/constant.js";
import {
  getPricingConfig,
  getQuoteForFileUpload,
  initStorachaClient,
} from "../utils/storacha.js";
import { createStorageRenewalTransaction } from "./solana.controller.js";

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
    console.error("Error creating UCAN delegation:", err);
    return res.status(500).json({ error: "Failed to create delegation" });
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
    console.log("The error is", err);
    return res.status(400).json({
      quoteObject: null,
      success: false,
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
    console.error(
      "An error occured while retrieving storage renewal cost",
      error,
    );
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
    console.error("Error making storage renewal:", error);
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
    console.error("Error confirming renewal:", error);
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
    console.error("Error fetching transaction history:", error);
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
    console.error("Error getting SOL/USD price:", error);
    return res.status(500).json({ message: "Failed to get SOL/USD price" });
  }
};
