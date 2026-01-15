import { sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db/db.js";

export const getServerHealth = async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: "up",
        server: "up",
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "down",
        server: "up",
      },
    });
  }
};
