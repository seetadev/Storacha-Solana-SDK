import { Request, Response } from "express";
import { configTable } from "../db/schema.js";
import { db } from "../db/db.js";

//All the endpoints in this Particular controller are protected using Auth middleware

export const updateRate = async (req: Request, res: Response) => {
  try {
    const { rate } = req.body;
    const result = await db
      .update(configTable)
      .set({
        rate_per_byte_per_day: rate,
      })
      .returning();
    return res.status(200).json({
      message: "Successfully updated the rate per file",
      value: result[0].rate_per_byte_per_day,
    });
  } catch (err) {
    console.log("The error is", err);
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
        min_duration_days: daysInSeconds,
      })
      .returning();
    return res.status(200).json({
      message: "Successfully updated the minimum Duration",
      value: result[0].min_duration_days,
    });
  } catch (err) {
    console.log("The error is", err);
    return res.status(500).json({ error: "Failed to update rate" });
  }
};
