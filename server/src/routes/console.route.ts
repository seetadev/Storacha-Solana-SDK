import express from "express";
import * as consoleController from "../controllers/console.controller.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

export const consoleRouter = express.Router();

consoleRouter.use(isAdmin); //middleware

consoleRouter.post("/update-rate", consoleController.updateRate);
consoleRouter.post("/update-min-duration", consoleController.updateMinDuration);
