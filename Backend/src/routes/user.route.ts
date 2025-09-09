import express from "express";
import * as userController from "../controllers/user.controller.js";
import multer from "multer";
const upload = multer();

export const userRouter = express.Router();

userRouter.post(
  "/uploadFile",
  upload.fields([{ name: "file", maxCount: 1 }]),
  userController.uploadFile,
);
userRouter.post("/createDelegation", userController.createUCANDelegation);
userRouter.get("/getQuote", userController.GetQuoteForFileUpload);
userRouter.get("/getUserUploadHistory", userController.GetUserUploadHistory);
