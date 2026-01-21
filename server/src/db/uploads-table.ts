import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "./db.js";
import { transaction, uploads } from "./schema.js";
import { logger } from "../utils/logger.js";

type TransactionData = {
  depositId: number;
  contentCid: string;
  transactionHash: string;
  transactionType: "initial_deposit" | "renewal";
  amountInLamports: number;
  durationDays: number;
};

/**
 * Get transactions related to a user addresss
 * @param wallet
 * @returns
 */
export const getUserHistory = async (wallet: string) => {
  try {
    const userAddres = wallet.toLowerCase();
    const userFiles = await db
      .select()
      .from(uploads)
      .where(eq(uploads.depositKey, userAddres))
      .orderBy(desc(uploads.createdAt));

    return userFiles;
  } catch (err) {
    logger.error("Error getting user history", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Find deposits that will expire in X days and haven't been warned yet
 * @param daysUntilExpiration - Number of days before expiration to warn (default: 7)
 * @returns Array of deposits that need warning emails
 */
export const getDepositsNeedingWarning = async (
  daysUntilExpiration: number = 7,
) => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilExpiration);
    const targetDateString = targetDate.toISOString().split("T")[0];

    const deposits = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.deletionStatus, "active"),
          lte(sql`DATE(${uploads.expiresAt})`, sql`DATE(${targetDateString})`),
          sql`${uploads.userEmail} IS NOT NULL`,
          sql`${uploads.userEmail} != ''`,
        ),
      );

    return deposits;
  } catch (err) {
    logger.error("Error getting deposits needing warning", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Find deposits that have already expired
 * @returns Array of expired deposits
 */
export const getExpiredDeposits = async () => {
  try {
    const now = new Date().toISOString().split("T")[0];

    const deposits = await db
      .select()
      .from(uploads)
      .where(
        and(
          sql`DATE(${uploads.expiresAt}) < DATE(${now})`,
          sql`${uploads.deletionStatus} IN ('active', 'warned')`,
        ),
      );

    return deposits;
  } catch (err) {
    logger.error("Error getting expired deposits", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Update the deletion status of a deposit
 * @param depositId - The ID of the deposit
 * @param status - New deletion status ('active' | 'warned' | 'deleted')
 * @returns Updated deposit record
 */
export const updateDeletionStatus = async (
  depositId: number,
  status: "active" | "warned" | "deleted",
) => {
  try {
    const updated = await db
      .update(uploads)
      .set({ deletionStatus: status })
      .where(eq(uploads.id, depositId))
      .returning();

    return updated[0] || null;
  } catch (err) {
    logger.error("Error updating deletion status", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Update the warningSentAt timestamp for a deposit
 * @param depositId - The ID of the deposit
 * @returns Updated deposit record
 */
export const updateWarningSentAt = async (depositId: number) => {
  try {
    const now = new Date().toISOString();
    const updated = await db
      .update(uploads)
      .set({
        warningSentAt: now,
        deletionStatus: "warned",
      })
      .where(eq(uploads.id, depositId))
      .returning();

    return updated[0] || null;
  } catch (err) {
    logger.error("Error updating warningSentAt", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 *
 * @param cid - CID of the upload/deposit to renew
 * @param duration - Number of additional days to extend storage for.
 * @returns Updated uplaod information
 */
export const renewStorageDuration = async (cid: string, duration: number) => {
  try {
    const existingUpload = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1);

    if (!existingUpload || existingUpload.length === 0) {
      logger.warn("File upload with CID does not exist", { cid });
      return null;
    }

    const deposit = existingUpload[0];

    const uploadExpirationDate = deposit.expiresAt
      ? new Date(deposit.expiresAt)
      : new Date();
    const today = new Date();
    const baseDate =
      uploadExpirationDate > today ? uploadExpirationDate : today;
    baseDate.setUTCDate(baseDate.getDate() + duration);
    const newStorageExpirationDate = baseDate.toISOString().split("T")[0];

    const newDuration = deposit.durationDays + duration;
    const deposits = await db
      .update(uploads)
      .set({
        durationDays: newDuration,
        deletionStatus: "active",
        warningSentAt: null,
        expiresAt: newStorageExpirationDate,
      })
      .where(eq(uploads.contentCid, cid))
      .returning();

    return deposits[0] || null;
  } catch (error) {
    logger.error("Failed to renew storage duration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Save a transaction for an upload
 */
export const saveTransaction = async (data: TransactionData) => {
  try {
    const result = await db
      .insert(transaction)
      .values({
        depositId: data.depositId,
        contentCid: data.contentCid,
        transactionHash: data.transactionHash,
        transactionType: data.transactionType,
        amountInLamports: data.amountInLamports,
        durationDays: data.durationDays,
      })
      .returning();

    return result[0] || null;
  } catch (err) {
    logger.error("Error saving transaction", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Get all transactions for an upload (by deposit ID)
 * Internal helper used by getTransactionsForCID
 */
const getUploadTransactions = async (depositId: number) => {
  try {
    const transactions = await db
      .select()
      .from(transaction)
      .where(eq(transaction.depositId, depositId))
      .orderBy(transaction.createdAt);

    return transactions;
  } catch (err) {
    logger.error("Error getting upload transactions", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

/**
 * Get all transactions for a specific CID
 */
export const getTransactionsForCID = async (cid: string) => {
  try {
    const deposit = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1);

    if (!deposit || deposit.length === 0) return null;

    return await getUploadTransactions(deposit[0].id);
  } catch (err) {
    logger.error("Error getting transactions for CID", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};
