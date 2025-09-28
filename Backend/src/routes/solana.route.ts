import express from "express";
import * as userController from "../controllers/user.controller.js";
import multer from "multer";

const upload = multer();

export const solanaRouter = express.Router();

solanaRouter.post(
  "/deposit",
  upload.fields([{ name: "file" }]),
  userController.deposit,
);
