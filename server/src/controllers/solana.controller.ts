import { PublicKey } from "@solana/web3.js";
import {
  createDepositInstruction,
  ensureConfigInitialized,
  extendStorageInstruction,
} from "../utils/solana/index.js";

type UploadItem = {
  depositAmount: number;
  durationDays: number;
  contentCID: string;
  publicKey: string;
  fileSize: number;
};

interface RenewalParams extends Omit<UploadItem, "depositAmount" | "fileSize"> {
  /** the new storage cost calculated based on
   * the new duration storage needs to be extended for
   */
  extensionCost: number;
}

export const createDepositTransaction = async (payload: UploadItem) => {
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

export const createStorageRenewalTransaction = async (
  payload: RenewalParams,
) => {
  const {
    publicKey: userPublicKey,
    durationDays,
    extensionCost,
    contentCID,
  } = payload;

  if (!userPublicKey || !contentCID || !extensionCost || !durationDays)
    throw new Error("Missing required parameters");

  const userPubkey = new PublicKey(userPublicKey);
  const durationNum = Number(durationDays);

  if (isNaN(durationNum)) throw new Error("Invalid duration");

  await ensureConfigInitialized();
  const storageRenewalIx = await extendStorageInstruction(
    contentCID,
    durationNum,
    Number(extensionCost),
    userPubkey,
  );

  return [
    {
      programId: storageRenewalIx.programId.toBase58(),
      keys: storageRenewalIx.keys.map((key) => ({
        pubkey: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: storageRenewalIx.data.toString("base64"),
    },
  ];
};
