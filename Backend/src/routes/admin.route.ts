import express from "express";
import * as adminController from "../controllers/admin.controller";
import { isAdmin } from "../middlewares/auth.middleware";

export const adminRouter = express.Router();

adminRouter.use(isAdmin);

adminRouter.post("/updateRate", adminController.updateRate);
adminRouter.post("/updateMinDuration", adminController.updateMinDuration);
