import express from "express";
import * as jobsController from "../controllers/jobs.controller.js";
import { verifyQStashRequest } from "../middleware/qstash.middleware.js";

export const jobs = express.Router();

jobs.post(
  "/send-warnings",
  verifyQStashRequest,
  jobsController.sendExpirationWarnings,
);

jobs.post(
  "/delete-expired",
  verifyQStashRequest,
  jobsController.deleteExpiredDeposits,
);
