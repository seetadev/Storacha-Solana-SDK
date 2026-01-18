import express from "express";
import multer from "multer";
import * as uploadController from "../controllers/upload.controller.js";

const upload = multer();

export const solanaRouter = express.Router();

solanaRouter.post(
  "/deposit",
  upload.fields([{ name: "file" }]),
  uploadController.deposit,
);