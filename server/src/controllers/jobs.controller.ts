import { UnknownLink } from "@storacha/client/types";
import { Link } from "@ucanto/core/schema";
import { Request, Response } from "express";
import {
  getDepositsNeedingWarning,
  getExpiredDeposits,
  updateDeletionStatus,
  updateWarningSentAt,
} from "../db/uploads-table.js";
import { sendExpirationWarningEmail } from "../services/email/resend.service.js";
import { logger } from "../utils/logger.js";
import { initStorachaClient } from "../utils/storacha.js";

/**
 * Checks for deposits needing expiration warnings
 */
export const sendExpirationWarnings = async (req: Request, res: Response) => {
  try {
    logger.info("Running expiration warning job");
    const depositsNeedingWarning = await getDepositsNeedingWarning();

    if (!depositsNeedingWarning || depositsNeedingWarning.length === 0) {
      logger.info("No uploads need warning emails at this time");
      return res.status(200).json({
        success: true,
        message: "No uploads need warnings",
      });
    }

    logger.info("Found uploads needing warnings", {
      count: depositsNeedingWarning.length,
    });

    for (const deposit of depositsNeedingWarning) {
      try {
        if (!deposit.userEmail) {
          logger.warn("Skipping this upload: no email address", {
            depositId: deposit.id,
          });
          continue;
        }

        if (!deposit.expiresAt) {
          logger.warn("Skipping this upload: no expiration date", {
            depositId: deposit.id,
          });
          continue;
        }

        const expirationDate = new Date(deposit.expiresAt);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        logger.info("Sending warning email for this upload", {
          depositId: deposit.id,
        });
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
          logger.info("Warning email sent for this upload", {
            depositId: deposit.id,
          });
        } else {
          logger.error("Failed to send email for this upload", {
            depositId: deposit.id,
            error: emailResult.error,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Error processing deposit", {
          depositId: deposit.id,
          error: errorMessage,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Expiration warnings processed",
    });
  } catch (error) {
    logger.error("Error in sendExpirationWarnings job", {
      error: error instanceof Error ? error.message : String(error),
    });
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
export const deleteExpiredUploads = async (req: Request, res: Response) => {
  try {
    logger.info("Running expired uploads deletion job");
    const expiredDeposits = await getExpiredDeposits();

    if (!expiredDeposits || expiredDeposits.length === 0) {
      logger.info("No expired uploads to delete at this time");
      return res.status(200).json({
        success: true,
        message: "No expired uploads to delete",
      });
    }

    logger.info("Found expired uploads to delete", {
      count: expiredDeposits.length,
    });
    const client = await initStorachaClient();

    for (const deposit of expiredDeposits) {
      try {
        logger.info("Deleting expired upload", {
          id: deposit.id,
          cid: deposit.contentCid,
          expiresAt: deposit.expiresAt,
          fileName: deposit.fileName,
          status: deposit.deletionStatus,
        });

        const cid = Link.parse(deposit.contentCid);
        await client.remove(cid as UnknownLink, {
          shards: true,
        });
        await updateDeletionStatus(deposit.id, "deleted");
        logger.info("Successfully deleted this upload", {
          depositId: deposit.id,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to delete this upload", {
          depositId: deposit.id,
          error: errorMessage,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Expired deposits processed",
    });
  } catch (error) {
    logger.error("Error in deleteExpiredUploads job", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      success: false,
      message: "Failed to process expired uploads deletion",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
