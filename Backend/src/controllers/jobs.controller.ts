import { Request, Response } from "express";
import {
  getDepositsNeedingWarning,
  getExpiredDeposits,
} from "../db/depositTable.js";

/**
 * Checks for deposits needing expiration warnings (daily at 9AM)
 */
export const sendExpirationWarnings = async (req: Request, res: Response) => {
  try {
    console.log("Running expiration warning job...");
    const depositsNeedingWarning = await getDepositsNeedingWarning();

    if (!depositsNeedingWarning || depositsNeedingWarning.length === 0) {
      console.log("No deposits need warning emails at this time");
      return res.status(200).json({
        success: true,
        message: "No deposits need warnings",
        count: 0,
      });
    }

    console.log(
      `Found ${depositsNeedingWarning.length} deposits needing warnings`,
    );

    for (const deposit of depositsNeedingWarning) {
      console.log(`Would send warning email for deposit:`, {
        id: deposit.id,
        cid: deposit.contentCid,
        email: deposit.userEmail,
        expiresAt: deposit.expiresAt,
        fileName: deposit.fileName,
      });

      // await sendWarningEmail(deposit);
      // await updateWarningSentAt(deposit.id);
    }

    return res.status(200).json({
      success: true,
      message: `${depositsNeedingWarning.length} warning emails will be sent`,
      count: depositsNeedingWarning.length,
      deposits: depositsNeedingWarning.map((d) => ({
        id: d.id,
        cid: d.contentCid,
        email: d.userEmail,
      })),
    });
  } catch (error) {
    console.error("Error in sendExpirationWarnings cron:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process expiration warnings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Deletes expired deposits from Storacha (runs daily 11AM for now)
 */
export const deleteExpiredDeposits = async (req: Request, res: Response) => {
  try {
    console.log("Running expired deposits deletion job...");
    const expiredDeposits = await getExpiredDeposits();

    if (!expiredDeposits || expiredDeposits.length === 0) {
      console.log("No expired deposits to delete at this time");
      return res.status(200).json({
        success: true,
        message: "No expired deposits to delete",
        count: 0,
      });
    }

    console.log(`Found ${expiredDeposits.length} expired deposits to delete`);

    for (const deposit of expiredDeposits) {
      console.log(`Would delete expired deposit:`, {
        id: deposit.id,
        cid: deposit.contentCid,
        expiresAt: deposit.expiresAt,
        fileName: deposit.fileName,
        status: deposit.deletionStatus,
      });

      // await storachaClient.remove(deposit.contentCid, { shards: true });
      // await updateDeletionStatus(deposit.id, "deleted");
    }

    return res.status(200).json({
      success: true,
      message: `Would delete ${expiredDeposits.length} expired deposits`,
      count: expiredDeposits.length,
      deposits: expiredDeposits.map((d) => ({
        id: d.id,
        cid: d.contentCid,
        status: d.deletionStatus,
      })),
    });
  } catch (error) {
    console.error("Error in deleteExpiredDeposits job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process expired deposits deletion",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
