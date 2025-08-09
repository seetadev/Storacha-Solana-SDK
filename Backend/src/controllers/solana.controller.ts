import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  createDepositInstruction,
  createInitializeConfigInstruction,
  ensureConfigInitialized,
} from "../utils/solana/index.js";

export const createDepositTransaction = async (req: Request, res: Response) => {
  try {
    const {
      publicKey: userPublicKey,
      size,
      cid,
      duration,
      depositAmount,
    } = req.body;

    if (!userPublicKey || !cid || !size || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userPubkey = new PublicKey(userPublicKey);
    const sizeNum = Number(size);
    const durationNum = Number(duration);

    if (isNaN(sizeNum) || isNaN(durationNum)) {
      return res.status(400).json({ error: "Invalid size or duration" });
    }

    await ensureConfigInitialized();
    const depositIx = await createDepositInstruction(
      userPubkey,
      cid,
      sizeNum,
      durationNum,
      Number(depositAmount),
    );

    const serializedInstructions = [
      {
        programId: depositIx.programId.toBase58(),
        keys: depositIx.keys.map((key) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        data: depositIx.data.toString("base64"),
      },
    ];

    return res.status(200).json({
      instructions: serializedInstructions,
      message: "Deposit instruction ready — user must sign",
    });
  } catch (err) {
    console.error("Error creating deposit transaction:", err);
    return res.status(500).json({
      error: "Failed to create deposit transaction",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const initializeConfig = async (req: Request, res: Response) => {
  try {
    const { adminPubkey } = req.body;
    if (!adminPubkey) {
      return res.status(400).json({ error: "Missing adminPubkey" });
    }

    const adminKey = new PublicKey(adminPubkey);
    // For testing, adminPubkey is the wallet address (you sign from frontend)
    const initIx = await createInitializeConfigInstruction(
      adminKey,
      1000,
      1,
      adminKey,
    );

    // Serialize instruction to send to frontend
    const serializedInstruction = {
      programId: initIx.programId.toBase58(),
      keys: initIx.keys.map((k) => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: initIx.data.toString("base64"),
    };

    res.status(200).json({ instructions: [serializedInstruction] });
  } catch (err) {
    console.error("Error creating initializeConfig instruction:", err);
    res
      .status(500)
      .json({ error: "Failed to create initializeConfig instruction" });
  }
};
