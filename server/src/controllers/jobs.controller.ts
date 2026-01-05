import { UnknownLink } from "@storacha/client/types";
import { Request, Response } from "express";
import {
  getDepositsNeedingWarning,
  getExpiredDeposits,
  updateDeletionStatus,
  updateWarningSentAt,
} from "../db/uploads-table.js";
import { sendExpirationWarningEmail } from "../services/email/resend.service.js";
import { initStorachaClient } from "../utils/storacha.js";

/**
 * Checks for deposits needing expiration warnings
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
      });
    }

    console.log(
      `Found ${depositsNeedingWarning.length} deposits needing warnings`,
    );

    for (const deposit of depositsNeedingWarning) {
      try {
        if (!deposit.userEmail) {
          console.warn(`Skipping deposit ${deposit.id}: no email address`);
          continue;
        }

        if (!deposit.expiresAt) {
          console.warn(`Skipping deposit ${deposit.id}: no expiration date`);
          continue;
        }

        const expirationDate = new Date(deposit.expiresAt);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        console.log(`Sending warning email for deposit ${deposit.id}...`);
        const emailResult = await sendExpirationWarningEmail(
          deposit.userEmail,
          {
            fileName: deposit.fileName || "Unknown File",
            cid: deposit.contentCid,
            expiresAt: deposit.expiresAt,
            daysRemaining,
          },
        );

        if (emailResult.success) {
          await updateWarningSentAt(deposit.id);
          console.log(`Warning email sent for deposit ${deposit.id}`);
        } else {
          console.error(
            `Failed to send email for deposit ${deposit.id}:`,
            emailResult.error,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing deposit ${deposit.id}:`, errorMessage);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Expiration warnings processed",
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
 * Deletes expired deposits from Storacha
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
      });
    }

    console.log(`Found ${expiredDeposits.length} expired deposits to delete`);
    const client = await initStorachaClient();

    for (const deposit of expiredDeposits) {
      try {
        console.log(`Deleting expired deposit:`, {
          id: deposit.id,
          cid: deposit.contentCid,
          expiresAt: deposit.expiresAt,
          fileName: deposit.fileName,
          status: deposit.deletionStatus,
        });

        await client.remove(deposit.contentCid as unknown as UnknownLink, {
          shards: true,
        });
        await updateDeletionStatus(deposit.id, "deleted");
        console.log(`Successfully deleted deposit ${deposit.id}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete deposit ${deposit.id}:`, errorMessage);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Expired deposits processed",
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
