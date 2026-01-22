import { NextFunction, Request, Response } from "express";

export function isMasterChief(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: "Who are you!" });
  }
  next();
}
