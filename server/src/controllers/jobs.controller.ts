import { UnknownLink } from '@storacha/client/types'
import { Link } from '@ucanto/core/schema'
import { Request, Response } from 'express'
import {
  batchUpdateWarningSentAt,
  getExpiredDeposits,
  getUploadsGroupedByEmail,
  updateDeletionStatus,
} from '../db/uploads-table.js'
import { sendBatchExpirationWarningEmail } from '../services/email/resend.service.js'
import { UsageService } from '../services/usage/usage.service.js'
import { logger } from '../utils/logger.js'
import { initStorachaClient } from '../utils/storacha.js'

/**
 * Checks for uploads needing expiration warnings and sends batched emails
 */
export const sendExpirationWarnings = async (_req: Request, res: Response) => {
  try {
    logger.info('Running expiration warning job')
    const groupedUploads = await getUploadsGroupedByEmail()

    if (!groupedUploads || groupedUploads.size === 0) {
      logger.info('No uploads need warning emails at this time')
      return res.status(200).json({
        success: true,
        message: 'No uploads need warnings',
      })
    }

    logger.info('Found uploads needing warnings', {
      userCount: groupedUploads.size,
      totalUploads: Array.from(groupedUploads.values()).reduce(
        (sum, uploads) => sum + uploads.length,
        0,
      ),
    })

    let successCount = 0
    let failureCount = 0

    for (const [email, uploads] of groupedUploads) {
      try {
        logger.info('Sending batched warning email', {
          email,
          uploadCount: uploads.length,
        })

        const emailResult = await sendBatchExpirationWarningEmail(
          email,
          uploads,
        )

        if (emailResult.success) {
          const uploadIds = uploads.map((u) => u.id)
          const updated = await batchUpdateWarningSentAt(uploadIds)

          logger.info('Batched warning email sent successfully', {
            email,
            uploadCount: uploads.length,
            updatedCount: updated,
          })

          successCount++
        } else {
          logger.error('Failed to send batched email', {
            email,
            uploadCount: uploads.length,
            error: emailResult.error,
          })
          failureCount++
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        logger.error('Error processing batched email for user', {
          email,
          uploadCount: uploads.length,
          error: errorMessage,
        })
        failureCount++
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Expiration warnings processed',
      stats: {
        usersEmailed: successCount,
        failures: failureCount,
      },
    })
  } catch (error) {
    logger.error('Error in sendExpirationWarnings job', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to process expiration warnings',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Deletes expired deposits from Storacha
 */
export const deleteExpiredUploads = async (_req: Request, res: Response) => {
  try {
    logger.info('Running expired uploads deletion job')
    const expiredDeposits = await getExpiredDeposits()

    if (!expiredDeposits || expiredDeposits.length === 0) {
      logger.info('No expired uploads to delete at this time')
      return res.status(200).json({
        success: true,
        message: 'No expired uploads to delete',
      })
    }

    logger.info('Found expired uploads to delete', {
      count: expiredDeposits.length,
    })
    const client = await initStorachaClient()

    for (const deposit of expiredDeposits) {
      try {
        logger.info('Deleting expired upload', {
          id: deposit.id,
          cid: deposit.contentCid,
          expiresAt: deposit.expiresAt,
          fileName: deposit.fileName,
          status: deposit.deletionStatus,
        })

        const cid = Link.parse(deposit.contentCid)
        await client.remove(cid as UnknownLink, {
          shards: true,
        })
        await updateDeletionStatus(deposit.id, 'deleted')
        logger.info('Successfully deleted this upload', {
          depositId: deposit.id,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        logger.error('Failed to delete this upload', {
          depositId: deposit.id,
          error: errorMessage,
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Expired deposits processed',
    })
  } catch (error) {
    logger.error('Error in deleteExpiredUploads job', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to process expired uploads deletion',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * daily usage snapshot job
 * runs every day at 9am UTC
 */
export const dailyUsageSnapshot = async (_req: Request, res: Response) => {
  try {
    logger.info('running daily usage snapshot job')

    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()

    await usageService.createDailySnapshot()

    return res.status(200).json({
      success: true,
      message: 'daily usage snapshot completed',
    })
  } catch (error) {
    logger.error('daily usage snapshot job failed', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to create usage snapshot',
    })
  }
}

/**
 * weekly usage comparison job
 * runs every sunday at 2am UTC
 */
export const weeklyUsageComparison = async (_req: Request, res: Response) => {
  try {
    logger.info('running weekly usage comparison job')

    const storachaClient = await initStorachaClient()
    const usageService = new UsageService(storachaClient)
    await usageService.initialize()

    await usageService.compareUsage()

    return res.status(200).json({
      success: true,
      message: 'weekly usage comparison completed',
    })
  } catch (error) {
    logger.error('weekly usage comparison job failed', { error })
    return res.status(500).json({
      success: false,
      error: 'failed to compare usage',
    })
  }
}
