import express from "express";
import * as userController from "../controllers/user.controller.js";

export const userRouter = express.Router();

userRouter.post("/create-delegation", userController.createUCANDelegation);

