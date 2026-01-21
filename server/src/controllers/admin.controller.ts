import { Request, Response } from "express";
import { db } from "../db/db.js";
import { configTable } from "../db/schema.js";
import { logger } from "../utils/logger.js";

//All the endpoints in this Particular controller are protected using Auth middleware

export const updateRate = async (req: Request, res: Response) => {
  try {
    const { rate } = req.body;
    const result = await db
      .update(configTable)
      .set({
        ratePerBytePerDay: rate,
      })
      .returning();
    return res.status(200).json({
      message: "Successfully updated the rate per file",
      value: result[0].ratePerBytePerDay,
    });
  } catch (err) {
    logger.error("Error updating rate per file", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: "Failed to update rate" });
  }
};

/**
 * Function to update the Minimum Duration
 * @returns
 */
export const updateMinDuration = async (req: Request, res: Response) => {
  try {
    const { duration } = req.body; // duration should be kept in seconds easier to handle
    const daysInSeconds = duration * 86400;
    const result = await db
      .update(configTable)
      .set({
        minDurationDays: daysInSeconds,
      })
      .returning();
    return res.status(200).json({
      message: "Successfully updated the minimum Duration",
      value: result[0].minDurationDays,
    });
  } catch (err) {
    logger.error("Error updating minimum duration", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: "Failed to update rate" });
  }
};
