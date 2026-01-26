import express from "express";
import * as consoleController from "../controllers/console.controller.js";
import { isMasterChief } from "../middlewares/auth.middleware.js";

export const consoleRouter = express.Router();

consoleRouter.use(isMasterChief);

consoleRouter.get("/usage/history", consoleController.getUsageHistory);
consoleRouter.get("/usage/current", consoleController.getCurrentUsage);
consoleRouter.get("/alerts", consoleController.getUnresolvedAlerts);
consoleRouter.post("/alerts/:id/resolve", consoleController.resolveAlert);
