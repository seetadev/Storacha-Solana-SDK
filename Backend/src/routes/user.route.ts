import express from "express";
import * as userController from "../controllers/user.controller.js";
import multer from "multer";
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
