import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminRouter } from "./routes/admin.route.js";
import { userRouter } from "./routes/user.route.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

/**
 *  Validate all required env variables upfront
 */
function validateEnv() {
  const requiredVars = ["DATABASE_URL", "PORT", "ADMIN_API_KEY"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
