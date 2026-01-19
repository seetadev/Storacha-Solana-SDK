import express from "express";
import * as transactionsController from "../controllers/transactions.controller.js";

export const transactionsRouter = express.Router();

transactionsRouter.get("/", transactionsController.getUploadTransactions);
