import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { createDepositInstruction } from "../utils/solana/index.js";

export const createDepositTransaction = async (req: Request, res: Response) => {
  console.log("Received deposit request", req.body);

  try {
    const { publicKey: userPublicKey, size, cid, duration } = req.body;

    if (!userPublicKey || !cid || !size || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userPubkey = new PublicKey(userPublicKey);
    const sizeNum = Number(size);
    const durationNum = Number(duration);

    if (isNaN(sizeNum) || isNaN(durationNum)) {
      return res.status(400).json({ error: "Invalid size or duration" });
    }

    const depositIx = await createDepositInstruction(
      userPubkey,
      cid,
      sizeNum,
      durationNum,
    );

    // instead of returning the blockhash we delegate this to the sdk/client
    // to construct teh transaction on their own.
    // after series of attempts sending the block hash, it is always invalidated whenever
    // i try to make a deposit with the solana wallet
    return res.status(200).json({
      instruction: {
        programId: depositIx.programId.toBase58(),
        keys: depositIx.keys.map((key) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        data: depositIx.data.toString("base64"),
      },
    });
  } catch (err) {
    console.error("Error creating deposit transaction:", err);
    return res
      .status(500)
      .json({ error: "Failed to create deposit transaction" });
  }
};
