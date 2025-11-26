import { Receiver } from "@upstash/qstash";
import { NextFunction, Request, Response } from "express";

/**
 * Verifies the requests from Upstash QStash using signature verification
 */
export const verifyQStashRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY!;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY!;

  if (!currentSigningKey || !nextSigningKey) {
    console.error("Signing keys not configured in environment variables");
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  try {
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });

    const signature = req.headers["upstash-signature"] as string;

    // upstash scheduled requests have empty body (optional while setting up)
    // if body is empty object, we should use it as (an empty string) for verification
    const body =
      Object.keys(req.body).length === 0 ? "" : JSON.stringify(req.body);

    // Verify the signature - SDK will throw if signature is missing or invalid
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      console.warn("🚫 Unauthorized cron request: invalid signature");
      return res.status(403).json({
        success: false,
        message: "Forbidden: invalid signature",
      });
    }

    console.log("signature verified successfully");
    next();
  } catch (error) {
    console.error("Error verifying signature:", error);
    return res.status(403).json({
      success: false,
      message: "Forbidden: signature verification failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
