import express from "express";
import * as userController from "../controllers/user.controller";

export const userRouter = express.Router();

userRouter.post("/uploadFile", userController.uploadFile);
userRouter.post("/createDelegation", userController.createUCANDelegation);
userRouter.get("/getQuote", userController.GetQuoteForFileUpload);
