// sentry requires us to have the instrument file as the topmost import
import "./instrument.js";

import * as Sentry from "@sentry/node";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { consoleRouter } from "./routes/console.route.js";
import { jobs as jobsRouter } from "./routes/jobs.route.js";
import { serverRouter } from "./routes/server.route.js";
import { solanaRouter } from "./routes/solana.route.js";
import { storageRouter } from "./routes/storage.route.js";
import { uploadsRouter } from "./routes/upload.route.js";
import { userRouter } from "./routes/user.route.js";
import { ensureConfigInitialized } from "./utils/solana/index.js";
import { pricingRouter } from "./routes/pricing.route.js";
import { transactionsRouter } from "./routes/transactions.route.js";

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
    console.log(missing);
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
validateEnv();

const app = express();
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use("/console", consoleRouter);
app.use("/upload", uploadsRouter);
app.use("/storage", storageRouter);
app.use("/user", userRouter);
app.use("/solana", solanaRouter);
app.use("/jobs", jobsRouter);
app.use("/health", serverRouter);
app.use("/pricing", pricingRouter)
app.use("/transactions", transactionsRouter)

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await ensureConfigInitialized();
    console.log("Solana config initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Solana config:", error);
    process.exit(1);
  }
});
