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
 * Function to upload file to storacha
 * @param req
 * @param res
 * @returns
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "file"
    ]?.[0];
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
 * Builds the deposit instruction for upload transaction
 */
export const deposit = async (req: Request, res: Response) => {
  try {
    const file = (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "file"
    ]?.[0];
    if (!file) return res.status(400).json({ message: "No file selected" });
    const fileMap: Record<string, Uint8Array> = {
      [file.originalname]: new Uint8Array(file.buffer),
    };

    const { publicKey, duration } = req.body;
    const durationInSeconds = parseInt(duration as string, 10);
    const sizeBytes = file.size;
    const ratePerBytePerDay = 1000;
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS);
    const amountInLamports = sizeBytes * duration_days * ratePerBytePerDay;

    const computedCID = await computeCID(fileMap);

    if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
      throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`);
    }
    const durationNum = Number(duration);
    if (!Number.isFinite(durationNum)) throw new Error("Invalid duration");

    const depositInstructions = await createDepositTransaction({
      publicKey,
      fileSize: sizeBytes,
      contentCID: computedCID,
      durationDays: duration_days,
      depositAmount: amountInLamports,
    });

    const depositItem: typeof depositAccount.$inferInsert = {
      deposit_amount: amountInLamports,
      duration_days,
      content_cid: computedCID,
      deposit_key: publicKey.toLowerCase(),
      deposit_slot: 1,
      last_claimed_slot: 1,
    };

    await db.insert(depositAccount).values(depositItem).returning();
    res.status(200).json({
      message: "Deposit instruction ready — sign to finalize upload",
      cid: computedCID,
      instructions: depositInstructions,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: "Error making a desposit",
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
