import express from "express";
import * as userController from "../controllers/user.controller.js";

export const userRouter = express.Router();

userRouter.post("/create-delegation", userController.createUCANDelegation);
userRouter.get("/get-quote", userController.GetQuoteForFileUpload);
userRouter.get("/sol-price", userController.getSolUsdPrice);
