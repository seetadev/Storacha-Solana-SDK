import { eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '../../db/db.js'
import {
  uploads,
  usage,
  usageAlerts,
  usageComparison,
} from '../../db/schema.js'
import { getPinataUsage } from '../storage/pinata.service.js'
import { logger } from '../../utils/logger.js'

const { EMAIL_FROM, WATCHMAN } = process.env!
const recipients: string | string[] = (() => {
  if (!WATCHMAN) return []
  try {
    return JSON.parse(WATCHMAN)
  } catch {
    return WATCHMAN
  }
})()
const resend = new Resend(process.env.RESEND_API_KEY)

export class UsageService {
  private planLimitBytes: number

  constructor() {
    // Default to 1GB free tier. Set PINATA_PLAN_LIMIT_MB env var when upgrading.
    const mb = parseInt(process.env.PINATA_PLAN_LIMIT_MB ?? '1024', 10)
    this.planLimitBytes = mb * 1024 * 1024
  }

  get planLimit(): number {
    return this.planLimitBytes
  }

  /**
   * Fetch current storage usage from Pinata.
   */
  async getUsage(): Promise<{
    totalSizeBytes: number
    pinCount: number
  }> {
    try {
      return await getPinataUsage()
    } catch (error) {
      logger.error('failed to fetch pinata usage', { error })
      throw new Error('failed to fetch pinata usage')
    }
  }

  /**
   * calculate our internal usage sum from the uploads table
   */
  async calculateInternalUsage(): Promise<{
    totalBytes: number
    activeUploads: number
  }> {
    const result = await db
      .select({
        totalBytes: sql<number>`COALESCE(SUM(${uploads.fileSize}), 0)`,
        activeUploads: sql<number>`COUNT(*)`,
      })
      .from(uploads)
      .where(eq(uploads.deletionStatus, 'active'))

    return {
      totalBytes: Number(result[0]?.totalBytes || 0),
      activeUploads: Number(result[0]?.activeUploads || 0),
    }
  }

  /**
   * create daily snapshot of usage
   */
  async createDailySnapshot(): Promise<void> {
    try {
      const [pinataUsage, internalUsage] = await Promise.all([
        this.getUsage(),
        this.calculateInternalUsage(),
      ])

      const storedBytes = pinataUsage.totalSizeBytes
      const utilization =
        this.planLimitBytes > 0 ? (storedBytes / this.planLimitBytes) * 100 : 0

      await db.insert(usage).values({
        totalBytesStored: internalUsage.totalBytes,
        totalActiveUploads: internalUsage.activeUploads,
        storachaReportedBytes: storedBytes,
        storachaPlanLimit: this.planLimitBytes,
        utilizationPercentage: utilization,
      })

      logger.info('daily usage snapshot created', {
        totalBytes: internalUsage.totalBytes,
        activeUploads: internalUsage.activeUploads,
        pinataReportedBytes: storedBytes,
        utilization: `${utilization.toFixed(2)}%`,
      })

      await this.checkThresholds(storedBytes, this.planLimitBytes, utilization)
    } catch (error) {
      logger.error('failed to create daily snapshot', { error })
      throw error
    }
  }

  /**
   * weekly comparison between our internal data and the pinata report
   */
  async compareUsage(): Promise<void> {
    try {
      const [pinataUsage, internalUsage] = await Promise.all([
        this.getUsage(),
        this.calculateInternalUsage(),
      ])

      const pinataBytes = pinataUsage.totalSizeBytes
      const discrepancy = pinataBytes - internalUsage.totalBytes
      const discrepancyPercentage =
        internalUsage.totalBytes > 0
          ? (Math.abs(discrepancy) / internalUsage.totalBytes) * 100
          : 0

      const status =
        discrepancyPercentage > 10
          ? 'critical'
          : discrepancyPercentage > 5
            ? 'warning'
            : 'ok'

      await db.insert(usageComparison).values({
        ourCalculatedBytes: internalUsage.totalBytes,
        storachaReportedBytes: pinataBytes,
        discrepancyBytes: discrepancy,
        discrepancyPercentage,
        status,
        notes:
          status !== 'ok'
            ? `discrepancy of ${(discrepancy / 1e9).toFixed(2)} GB (${discrepancyPercentage.toFixed(2)}%)`
            : null,
      })

      logger.info('usage comparison completed', {
        ourBytes: internalUsage.totalBytes,
        pinataBytes,
        discrepancy,
        status,
      })

      if (status !== 'ok') {
        await this.createAlert({
          alertType: 'comparison_discrepancy',
          alertLevel: status === 'critical' ? 'critical' : 'warning',
          message: `usage comparison shows ${discrepancyPercentage.toFixed(2)}% discrepancy (${(Math.abs(discrepancy) / 1e9).toFixed(2)} GB difference)`,
        })
      }
    } catch (error) {
      logger.error('failed to compare usage', { error })
      throw error
    }
  }

  /**
   * check utilization thresholds and create alerts
   */
  private async checkThresholds(
    bytesStored: number,
    planLimit: number,
    utilization: number,
  ): Promise<void> {
    const thresholds = [
      { level: 80, type: 'threshold_80', alertLevel: 'warning' as const },
      { level: 90, type: 'threshold_90', alertLevel: 'warning' as const },
      { level: 95, type: 'threshold_95', alertLevel: 'critical' as const },
    ]

    for (const threshold of thresholds) {
      if (utilization >= threshold.level) {
        const existingAlert = await db
          .select()
          .from(usageAlerts)
          .where(
            sql`${usageAlerts.alertType} = ${threshold.type} AND ${usageAlerts.resolved} IS NULL`,
          )
          .limit(1)

        if (existingAlert.length === 0) {
          await this.createAlert({
            alertType: threshold.type,
            alertLevel: threshold.alertLevel,
            utilizationPercentage: utilization,
            bytesStored,
            planLimit,
            message: `usage at ${utilization.toFixed(2)}% (${(bytesStored / 1e9).toFixed(2)} GB / ${(planLimit / 1e9).toFixed(2)} GB)`,
          })

          logger.warn(`usage threshold alert: ${threshold.level}%`, {
            utilization: `${utilization.toFixed(2)}%`,
            bytesStored,
            planLimit,
          })
        }
      }
    }
  }

  /**
   * create usage alert and send email
   */
  private async createAlert(alert: {
    alertType: string
    alertLevel: 'warning' | 'critical'
    utilizationPercentage?: number
    bytesStored?: number
    planLimit?: number
    message: string
  }): Promise<void> {
    await db.insert(usageAlerts).values(alert)
    logger.info('usage alert created', alert)

    try {
      await resend.emails.send({
        from: EMAIL_FROM as string,
        to: recipients,
        subject: `🚨 [${alert.alertLevel.toUpperCase()}] storage alert - ${alert.alertType.replace(/_/g, ' ')}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; background: #080808; color: #fff; padding: 32px; border-radius: 12px;">
            <h2 style="color: ${alert.alertLevel === 'critical' ? '#ef4444' : '#f59e0b'}; margin-bottom: 16px;">
              ${alert.alertLevel === 'critical' ? '🔴' : '⚠️'} storage ${alert.alertLevel} alert
            </h2>
            <p style="color: #949495; margin-bottom: 24px; font-size: 16px;">${alert.message}</p>

            ${
              alert.utilizationPercentage
                ? `
              <div style="background: #100f0f; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #141414;">
                <p style="color: #949495; font-size: 14px; margin-bottom: 8px;">utilization</p>
                <p style="font-size: 32px; font-weight: 600; color: ${alert.alertLevel === 'critical' ? '#ef4444' : '#f59e0b'}; margin: 0;">
                  ${alert.utilizationPercentage.toFixed(2)}%
                </p>
                ${
                  alert.bytesStored && alert.planLimit
                    ? `
                  <p style="color: #949495; font-size: 14px; margin-top: 8px;">
                    ${(alert.bytesStored / 1e9).toFixed(2)} GB / ${(alert.planLimit / 1e9).toFixed(2)} GB
                  </p>
                `
                    : ''
                }
              </div>
            `
                : ''
            }

            <p style="color: #949495; font-size: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #141414;">
              alert type: ${alert.alertType}<br/>
              created: ${new Date().toISOString()}
            </p>
          </div>
        `,
        text: `${alert.alertLevel.toUpperCase()} STORAGE ALERT\n\n${alert.message}\n\nAlert Type: ${alert.alertType}`,
      })

      logger.info('alert email sent', {
        to: recipients,
        alertType: alert.alertType,
      })
    } catch (error) {
      logger.error('failed to send alert email', { error })
      // don't throw - alert is already in DB
    }
  }

  /**
   * get recent usage history
   */
  async getUsageHistory(days: number = 30) {
    return await db
      .select()
      .from(usage)
      .orderBy(sql`${usage.snapshotDate} DESC`)
      .limit(days)
  }

  /**
   * get unresolved alerts
   */
  async getUnresolvedAlerts() {
    return await db
      .select()
      .from(usageAlerts)
      .where(sql`${usageAlerts.resolved} IS NULL`)
      .orderBy(sql`${usageAlerts.createdAt} DESC`)
  }

  /**
   * resolve an alert
   */
  async resolveAlert(alertId: number): Promise<void> {
    await db
      .update(usageAlerts)
      .set({ resolved: new Date() })
      .where(eq(usageAlerts.id, alertId))

    logger.info('usage alert resolved', { alertId })
  }
}
