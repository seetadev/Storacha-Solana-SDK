import { Request, Response } from "express";
import { getTransactionsForCID } from "../db/uploads-table.js";
import { logger } from "../utils/logger.js";


/**
 * Get all transactions for a specific upload (by CID)
 */
export const getUploadTransactions = async (req: Request, res: Response) => {
    try {
      const { cid } = req.query;
      if (!cid) return res.status(400).json({ message: "CID is required" });
  
      const transactions = await getTransactionsForCID(cid as string);
      if (!transactions)
        return res.status(404).json({ message: "No transactions found" });
  
      return res.status(200).json({
        success: true,
        transactions,
      });
  } catch (error) {
    logger.error("Error fetching transaction history", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
  };
  