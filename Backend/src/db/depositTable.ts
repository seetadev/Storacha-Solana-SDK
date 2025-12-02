import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "./db.js";
import { depositAccount } from "./schema.js";

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
      .from(depositAccount)
      .where(eq(depositAccount.depositKey, userAddres));
    return userFiles;
  } catch (err) {
    console.log("Error getting user history", err);
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
      .from(depositAccount)
      .where(
        and(
          eq(depositAccount.deletionStatus, "active"),
          lte(
            sql`DATE(${depositAccount.expiresAt})`,
            sql`DATE(${targetDateString})`,
          ),
          sql`${depositAccount.userEmail} IS NOT NULL`,
          sql`${depositAccount.userEmail} != ''`,
        ),
      );

    return deposits;
  } catch (err) {
    console.error("Error getting deposits needing warning:", err);
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
      .from(depositAccount)
      .where(
        and(
          sql`DATE(${depositAccount.expiresAt}) < DATE(${now})`,
          sql`${depositAccount.deletionStatus} IN ('active', 'warned')`,
        ),
      );

    return deposits;
  } catch (err) {
    console.error("Error getting expired deposits:", err);
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
      .update(depositAccount)
      .set({ deletionStatus: status })
      .where(eq(depositAccount.id, depositId))
      .returning();

    return updated[0] || null;
  } catch (err) {
    console.error("Error updating deletion status:", err);
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
      .update(depositAccount)
      .set({
        warningSentAt: now,
        deletionStatus: "warned",
      })
      .where(eq(depositAccount.id, depositId))
      .returning();

    return updated[0] || null;
  } catch (err) {
    console.error("Error updating warningSentAt:", err);
    return null;
  }
};

/**
 *
 * @param cid - CID of the upload/deposit to remove
 * @param duration - Number of additional days to extend storage for.
 * @returns Updated uplaod information
 */
export const renewStorageDuration = async (cid: string, duration: number) => {
  try {
    const existingUpload = await db
      .select()
      .from(depositAccount)
      .where(eq(depositAccount.contentCid, cid))
      .limit(1);

    if (!existingUpload || existingUpload.length === 0) {
      console.error(`File upload with this CID: ${cid} does not exist`);
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
      .update(depositAccount)
      .set({
        durationDays: newDuration,
        deletionStatus: "active",
        warningSentAt: null,
        expiresAt: newStorageExpirationDate,
      })
      .where(eq(depositAccount.contentCid, cid))
      .returning();

    return deposits[0] || null;
  } catch (error) {
    console.error("Failed to renew storage duration", error);
    return null;
  }
};
