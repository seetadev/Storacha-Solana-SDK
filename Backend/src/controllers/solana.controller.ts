import { PublicKey } from "@solana/web3.js";
import {
  createDepositInstruction,
  ensureConfigInitialized,
} from "../utils/solana/index.js";

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

  if (!userPublicKey || !contentCID || !fileSize || !durationDays)
    throw new Error("Missing required parameters");

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
    Number(depositAmount),
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
