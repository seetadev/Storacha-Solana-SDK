import express from "express";
import * as cronController from "../controllers/jobs.controller.js";
import { verifyQStashRequest } from "../middleware/qstash.middleware.js";

export const jobs = express.Router();

jobs.post(
  "/send-warnings",
  verifyQStashRequest,
  cronController.sendExpirationWarnings,
);

jobs.post(
  "/delete-expired",
  verifyQStashRequest,
  cronController.deleteExpiredDeposits,
);
