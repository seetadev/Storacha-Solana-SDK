import { Request, Response } from "express";
import { UsageService } from "../services/usage/usage.service.js";
import { logger } from "../utils/logger.js";
import { initStorachaClient } from "../utils/storacha.js";

/**
 * get usage history
 */
export const getUsageHistory = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const storachaClient = await initStorachaClient();
    const usageService = new UsageService(storachaClient);
    const history = await usageService.getUsageHistory(days);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error("failed to get usage history", { error });
    return res.status(500).json({
      success: false,
      error: "failed to fetch usage history",
    });
  }
};

/**
 * get current usage
 */
export const getCurrentUsage = async (req: Request, res: Response) => {
  try {
    const storachaClient = await initStorachaClient();
    const usageService = new UsageService(storachaClient);

    const [storachaUsage, internalUsage] = await Promise.all([
      usageService.getStorachaUsage(),
      usageService.calculateInternalUsage(),
    ]);

    const storachaBytes = storachaUsage.finalSize;
    const planLimit = usageService["planLimitBytes"];
    const utilization = planLimit > 0 ? (storachaBytes / planLimit) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        storacha: {
          totalBytes: storachaBytes,
          planLimit,
          utilizationPercentage: utilization,
        },
        internal: {
          totalBytes: internalUsage.totalBytes,
          activeUploads: internalUsage.activeUploads,
        },
        discrepancy: {
          bytes: storachaBytes - internalUsage.totalBytes,
          percentage:
            internalUsage.totalBytes > 0
              ? ((storachaBytes - internalUsage.totalBytes) /
                  internalUsage.totalBytes) *
                100
              : 0,
        },
      },
    });
  } catch (error) {
    logger.error("failed to get current usage", { error });
    return res.status(500).json({
      success: false,
      error: "failed to fetch current usage",
    });
  }
};

/**
 * get unresolved alerts
 */
export const getUnresolvedAlerts = async (req: Request, res: Response) => {
  try {
    const storachaClient = await initStorachaClient();
    const usageService = new UsageService(storachaClient);
    const alerts = await usageService.getUnresolvedAlerts();

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error("failed to get unresolved alerts", { error });
    return res.status(500).json({
      success: false,
      error: "failed to fetch alerts",
    });
  }
};

/**
 * resolve an alert
 */
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    const storachaClient = await initStorachaClient();
    const usageService = new UsageService(storachaClient);
    await usageService.resolveAlert(alertId);

    return res.status(200).json({
      success: true,
      message: "alert resolved",
    });
  } catch (error) {
    logger.error("failed to resolve alert", { error });
    return res.status(500).json({
      success: false,
      error: "failed to resolve alert",
    });
  }
};
