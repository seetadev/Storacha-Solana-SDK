import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminRouter } from "./routes/admin.route.js";
import { userRouter } from "./routes/user.route.js";
import { solanaRouter } from "./routes/solana.route.js";
import { ensureConfigInitialized } from "./utils/solana/index.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

/**
 *  Validate all required env variables upfront
 */
function validateEnv() {
  const requiredVars = ["DATABASE_URL", "ADMIN_API_KEY"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.log(missing);
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
validateEnv();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/solana", solanaRouter);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const result = await ensureConfigInitialized();
  } catch (error) {
    console.error("❌ Failed to initialize Solana config:", error);
    process.exit(1);
  }
});
