import { Request, Response } from 'express'
import { UsageService } from '../services/usage/usage.service.js'
import { logger } from '../utils/logger.js'
import { getEscrowBalance, withdrawFees } from '../utils/solana/index.js'
import { initStorachaClient } from '../utils/storacha.js'

/**
 * get usage history
 */
export const getUsageHistory = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30

    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()
    const history = await usageService.getUsageHistory(days)

    return res.status(200).json({
      success: true,
      data: history,
    })
  } catch (error) {
    logger.error('failed to get usage history', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to fetch usage history',
    })
  }
}

/**
 * get current usage
 */
export const getCurrentUsage = async (_req: Request, res: Response) => {
  try {
    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()

    const [storachaUsage, internalUsage] = await Promise.all([
      usageService.getStorachaUsage(),
      usageService.calculateInternalUsage(),
    ])

    const storachaBytes = storachaUsage.finalSize
    const planLimit = usageService.planLimit
    const utilization = planLimit > 0 ? (storachaBytes / planLimit) * 100 : 0

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
    })
  } catch (error) {
    logger.error('failed to get current usage', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to fetch current usage',
    })
  }
}

/**
 * get unresolved alerts
 */
export const getUnresolvedAlerts = async (_req: Request, res: Response) => {
  try {
    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()
    const alerts = await usageService.getUnresolvedAlerts()

    return res.status(200).json({
      success: true,
      data: alerts,
    })
  } catch (error) {
    logger.error('failed to get unresolved alerts', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to fetch alerts',
    })
  }
}

/**
 * resolve an alert
 */
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    )

    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()
    await usageService.resolveAlert(alertId)

    return res.status(200).json({
      success: true,
      message: 'alert resolved',
    })
  } catch (error) {
    logger.error('failed to resolve alert', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to resolve alert',
    })
  }
}

/**
 * get escrow vault balance
 */
export const getEscrowVaultBalance = async (_req: Request, res: Response) => {
  try {
    const balance = await getEscrowBalance()

    // convert bigint to string for JSON serialization
    return res.status(200).json({
      success: true,
      data: {
        totalDeposits: balance.totalDeposits.toString(),
        totalClaimed: balance.totalClaimed.toString(),
        availableBalance: balance.availableBalance.toString(),
        accountLamports: balance.accountLamports.toString(),

        availableBalanceSOL: Number(balance.availableBalance) / 1e9,
        totalDepositsSOL: Number(balance.totalDeposits) / 1e9,
        totalClaimedSOL: Number(balance.totalClaimed) / 1e9,
      },
    })
  } catch (error) {
    logger.error('failed to get escrow balance', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to fetch escrow balance',
    })
  }
}

/**
 * withdraw fees from escrow vault
 */
export const withdrawFeesFromEscrow = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'amount is required (in lamports)',
      })
    }

    const amountBigInt = BigInt(amount)

    if (amountBigInt <= 0n) {
      return res.status(400).json({
        success: false,
        error: 'amount must be greater than 0',
      })
    }

    const balance = await getEscrowBalance()
    if (amountBigInt > balance.availableBalance) {
      return res.status(400).json({
        success: false,
        error: `insufficient balance. available: ${balance.availableBalance.toString()} lamports (${Number(balance.availableBalance) / 1e9} SOL)`,
      })
    }

    const signature = await withdrawFees(amountBigInt)

    logger.info('withdrawal successful', {
      amount: amount.toString(),
      amountSOL: Number(amountBigInt) / 1e9,
      signature,
    })

    return res.status(200).json({
      success: true,
      data: {
        signature,
        amount: amount.toString(),
        amountSOL: Number(amountBigInt) / 1e9,
      },
    })
  } catch (error) {
    logger.error('failed to withdraw fees', { error })
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'failed to withdraw fees',
    })
  }
}
