import express from "express";
import * as solanaController from "../controllers/solana.controller.js";

export const solanaRouter = express.Router();

solanaRouter.post("/deposit", solanaController.createDepositTransaction);
