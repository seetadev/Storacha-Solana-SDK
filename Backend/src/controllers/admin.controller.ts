import { Request, Response } from "express";
import { configTable } from "../db/schema.js";
import { db } from "../db/db.js";
import { INTERNAL_SERVER_ERROR_CODE, SUCCESS_CODE } from "../utils/constant.js";

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
    return res.status(SUCCESS_CODE).json({
      message: "Successfully updated the rate per file",
      value: result[0].rate_per_byte_per_day,
    });
  } catch (err) {
    console.log("The error is", err);
    return res
      .status(INTERNAL_SERVER_ERROR_CODE)
      .json({ error: "Failed to update rate" });
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
    return res.status(SUCCESS_CODE).json({
      message: "Successfully updated the minimum Duration",
      value: result[0].min_duration_days,
    });
  } catch (err) {
    console.log("The error is", err);
    return res
      .status(INTERNAL_SERVER_ERROR_CODE)
      .json({ error: "Failed to update rate" });
  }
};
