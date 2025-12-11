import express from "express";
import multer from "multer";
import * as userController from "../controllers/user.controller.js";
const upload = multer();

export const userRouter = express.Router();

userRouter.post(
  "/upload-file",
  upload.single("file"),
  userController.uploadFile,
);
userRouter.post(
  "/upload-files",
  upload.array("file"),
  userController.uploadFiles,
);
userRouter.post("/create-delegation", userController.createUCANDelegation);
userRouter.get("/get-quote", userController.GetQuoteForFileUpload);
userRouter.get("/user-upload-history", userController.GetUserUploadHistory);
userRouter.post(
  "/update-transaction-hash",
  userController.updateTransactionHash,
);
userRouter.get("/api/user/renewal-cost", userController.getStorageRenewalCost);
userRouter.post("/api/user/renew-storage", userController.renewStorage);
userRouter.post(
  "/api/user/confirm-renewal",
  userController.confirmStorageRenewal,
);
userRouter.get("/api/user/transactions", userController.getUploadTransactions);
