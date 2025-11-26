import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export const shareCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many share links created from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicShareAccessLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://w3s.link"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const validateShareCreation = (req: Request, res: Response, next: NextFunction) => {
  const { contentCid, ownerId } = req.body;

  if (!contentCid || !ownerId) {
    return res.status(400).json({
      success: false,
      message: "Content CID and Owner ID are required",
    });
  }

  if (typeof contentCid !== "string" || contentCid.length < 10) {
    return res.status(400).json({
      success: false,
      message: "Invalid content CID format",
    });
  }

  if (typeof ownerId !== "string" || ownerId.length !== 44) {
    return res.status(400).json({
      success: false,
      message: "Invalid owner ID (wallet address)",
    });
  }

  const { expiresAt, maxViews, password, permissions } = req.body;

  if (expiresAt) {
    const expDate = new Date(expiresAt);
    if (isNaN(expDate.getTime()) || expDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiration date must be in the future",
      });
    }
  }

  if (maxViews !== undefined) {
    if (!Number.isInteger(maxViews) || maxViews < 1) {
      return res.status(400).json({
        success: false,
        message: "Max views must be a positive integer",
      });
    }
  }

  if (password && (typeof password !== "string" || password.length < 6)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (permissions && !Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: "Permissions must be an array",
    });
  }

  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === "string") {
      return obj.replace(/<[^>]*>?/gm, "").trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj !== null && typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

export const publicShareCors = {
  origin: (origin: string | undefined, callback: Function) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:5173",
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
