import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  createDepositInstruction,
  sendTransaction,
} from "../utils/solana/index.js";

export const createDepositTransaction = async (req: Request, res: Response) => {
  console.log("Received deposit request", req.body);

  try {
    const { publicKey: userPublicKey, size, cid, duration } = req.body;

    if (!userPublicKey || !cid || !size || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userPubkey = new PublicKey(userPublicKey);

    const depositIx = await createDepositInstruction(
      userPubkey,
      cid,
      size,
      duration,
    );

    const signature = await sendTransaction([depositIx]);

    return res
      .status(200)
      .json({ message: "Deposit transaction submitted", signature });
  } catch (err) {
    console.error("Error creating deposit transaction:", err);
    return res
      .status(500)
      .json({ error: "Failed to create deposit transaction" });
  }
};
