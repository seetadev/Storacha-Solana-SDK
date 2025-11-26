import express from "express";
import * as shareController from "../controllers/share.controller.js";
import {
  shareCreationLimiter,
  publicShareAccessLimiter,
  passwordAttemptLimiter,
  validateShareCreation,
  sanitizeInput,
} from "../middlewares/security.middleware.js";

export const shareRouter = express.Router();

shareRouter.use(sanitizeInput);

shareRouter.post("/create", shareCreationLimiter, validateShareCreation, shareController.createShareLink);
shareRouter.get("/list", shareController.getUserShareLinks);
shareRouter.get("/analytics", shareController.getShareAnalytics);
shareRouter.get("/:shareId", shareController.getShareDetails);
shareRouter.put("/:shareId", shareController.updateShareLink);
shareRouter.delete("/:shareId", shareController.revokeShareLink);

export const publicShareRouter = express.Router();
publicShareRouter.use(sanitizeInput);
publicShareRouter.get("/:token", publicShareAccessLimiter, shareController.accessSharedFile);
publicShareRouter.post("/:token/verify", passwordAttemptLimiter, shareController.verifySharePassword);
