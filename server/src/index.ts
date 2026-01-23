// sentry requires us to have the instrument file as the topmost import
import "./instrument.js";

import * as Sentry from "@sentry/node";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import morgan, { FormatFn } from "morgan";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { consoleRouter } from "./routes/console.route.js";
import { jobs as jobsRouter } from "./routes/jobs.route.js";
import { pricingRouter } from "./routes/pricing.route.js";
import { serverRouter } from "./routes/server.route.js";
import { solanaRouter } from "./routes/solana.route.js";
import { storageRouter } from "./routes/storage.route.js";
import { transactionsRouter } from "./routes/transactions.route.js";
import { uploadsRouter } from "./routes/upload.route.js";
import { userRouter } from "./routes/user.route.js";
import { logger } from "./utils/logger.js";
import { ensureConfigInitialized } from "./utils/solana/index.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

/**
 *  Validate all required env variables upfront
 */
function validateEnv() {
  const requiredVars = [
    "DATABASE_URL",
    "ADMIN_API_KEY",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
    "RESEND_API_KEY",
  ];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error("Missing required environment variables", { missing });
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
validateEnv();

const app = express();
const corsOptions: cors.CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"], // OPTIONS is required for preflight requests
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Content-Type"],
  maxAge: 3600, // cache preflight response for 1 hour
};

app.use(cors(corsOptions));
app.use(express.json());
const requestLogFormat: FormatFn<Request, Response> = (tokens, req, res) =>
  JSON.stringify({
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens["response-time"](req, res)),
    contentLength: tokens.res(req, res, "content-length"),
    userAgent: tokens["user-agent"](req, res),
    ip: tokens["remote-addr"](req, res),
  });

app.use(morgan(requestLogFormat, { stream: logger.stream }));
app.use(apiLimiter);

app.use("/console", consoleRouter);
app.use("/upload", uploadsRouter);
app.use("/storage", storageRouter);
app.use("/user", userRouter);
app.use("/solana", solanaRouter);
app.use("/jobs", jobsRouter);
app.use("/health", serverRouter);
app.use("/pricing", pricingRouter);
app.use("/transactions", transactionsRouter);

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, async () => {
  logger.info("Server running", { port: PORT });
  try {
    await ensureConfigInitialized();
    logger.info("Solana config initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Solana config", {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.warn(
      "Server will continue running despite Solana config initialization failure",
    );
  }
});
