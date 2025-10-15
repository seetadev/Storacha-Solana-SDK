import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  createDepositInstruction,
  createInitializeConfigInstruction,
  ensureConfigInitialized,
} from "../utils/solana/index.js";
import { getAdminDataForSolana } from "../utils/Storacha.js";

type DepositItem = {
  depositAmount: number;
  durationDays: number;
  contentCID: string;
  publicKey: string;
  fileSize: number;
};

export const createDepositTransaction = async (payload: DepositItem) => {
  const {
    publicKey: userPublicKey,
    contentCID,
    durationDays,
    fileSize,
    depositAmount,
  } = payload;

  if (!userPublicKey || !contentCID || !fileSize || !durationDays) {
    throw new Error("Missing required parameters");
  }

  const userPubkey = new PublicKey(userPublicKey);
  const sizeNum = Number(fileSize);
  const durationNum = Number(durationDays);

  if (isNaN(sizeNum) || isNaN(durationNum))
    throw new Error("Invalid size or duration");

  await ensureConfigInitialized();
  const depositIx = await createDepositInstruction(
    userPubkey,
    contentCID,
    sizeNum,
    durationNum,
    Number(depositAmount)
  );

  return [
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
};

export const initializeConfig = async (req: Request, res: Response) => {
  try {
    const { adminPubkey } = req.body;
    if (!adminPubkey) {
      return res.status(400).json({ error: "Missing adminPubkey" });
    }

    const adminKey = new PublicKey(adminPubkey);
    const solanaData = await getAdminDataForSolana();
    // For testing, adminPubkey is the wallet address (you sign from frontend)
    const initIx = await createInitializeConfigInstruction(
      adminKey,
      solanaData?.RATE_PER_BYTE_PER_UNIT || 1000,
      solanaData?.MINIMUM_DURATION_UNIT || 1,
      adminKey
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
