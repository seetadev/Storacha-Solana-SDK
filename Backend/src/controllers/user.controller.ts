import { Request, Response } from "express";
import {
  getQuoteForFileUpload,
  initStorachaClient,
} from "../utils/Storacha.js";
import { QuoteOutput } from "../types/StorachaTypes.js";
import * as Delegation from "@ucanto/core/delegation";
import { DID } from "@ucanto/core";
import { Link } from "@ucanto/core/schema";
import { Capabilities } from "@storacha/client/types";
import { depositAccount } from "../db/schema.js";
import { db } from "../db/db.js";
import { DAY_TIME_IN_SECONDS } from "../utils/constant.js";
import { computeCID } from "../utils/compute-cid.js";
import { createDepositTransaction } from "./solana.controller.js";
import { getUserHistory } from "../db/depositTable.js";
import { getExpiryDate } from "../utils/functions.js";

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

    res.status(200).json({
      message: "Upload successful",
      cid: uploadedCID,
      object: uploadObject,
    });
  } catch (error: any) {
    console.error("Error uploading file to Storacha:", error);
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
      uploadedAt: new Date().toISOString()
    };

    res.status(200).json({
      message: "Upload successful",
      cid: uploadedCID,
      object: uploadObject,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
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

    const { publicKey, duration } = req.body;
    const durationInSeconds = parseInt(duration as string, 10);
    const ratePerBytePerDay = 1000;
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS);
    const amountInLamports = totalSize * duration_days * ratePerBytePerDay;

    const computedCID = await computeCID(fileMap);

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

    const depositItem: typeof depositAccount.$inferInsert = {
      deposit_amount: amountInLamports,
      duration_days,
      content_cid: computedCID,
      deposit_key: publicKey.toLowerCase(),
      deposit_slot: 1,
      last_claimed_slot: 1,
      expires_at: backupExpirationDate,
      created_at: new Date().toISOString(),
    };

    await db.insert(depositAccount).values(depositItem).returning();

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
    console.error(error);
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
      quoteObject: QuoteObject,
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
