import { Client as StorachaClient } from '@storacha/client'
import { eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '../../db/db.js'
import {
  uploads,
  usage,
  usageAlerts,
  usageComparison,
} from '../../db/schema.js'
import { logger } from '../../utils/logger.js'

const { EMAIL_FROM, WATCHMAN } = process.env!
const resend = new Resend(process.env.RESEND_API_KEY)

interface UsageReport {
  finalSize: number
  initialSize: number
}

export class UsageService {
  private client: StorachaClient
  private planLimitBytes: number

  constructor(client: StorachaClient, planLimitBytes: number = 5_000_000_000) {
    this.client = client
    this.planLimitBytes = planLimitBytes // default 5GiB size
  }

  get planLimit(): number {
    return this.planLimitBytes
  }

  /**
   * get plan limit from storacha using plan/get capability
   *
   * the limit is optional - absent means unlimited according to the
   * storacha spec here: https://github.com/storacha/specs/pull/150
   * @returns limit in bytes, or null if unlimited
   */
  private async fetchPlanLimit(): Promise<number | null> {
    try {
      const accounts = this.client.accounts()
      const accountEntries = Object.values(accounts)

      if (accountEntries.length === 0) {
        logger.warn('no storacha account found, using default plan limit')
        return 5_000_000_000 // 5GiB default for free
      }

      const account = accountEntries[0]
      const accountDID = account.did()

      const plan = await this.client.capability.plan.get(accountDID)

      // limit is a string in bytes, needs to be parsed
      // TS is complaining that "Property limit does not exist on type PlanGetSuccess."
      // but that's probably a npm cache thing because in the latest version
      // of the upload client we already have it present. see it: https://github.com/storacha/upload-service/blob/dfd96c418d86e3fe94d3eafa669caf5b701bf728/packages/capabilities/src/types.ts#L1132
      const limitBytes = parseInt(plan.limit, 10)

      logger.info('plan limit fetched from storacha', {
        accountDID,
        limitBytes,
        limitGB: (limitBytes / 1e9).toFixed(2),
      })

      return limitBytes
    } catch (error) {
      logger.error('failed to fetch plan limit from storacha', { error })
      return 5_000_000_000
    }
  }

  /**
   * init the service
   */
  async initialize(): Promise<void> {
    const fetchedLimit = await this.fetchPlanLimit()
    if (fetchedLimit !== null) {
      this.planLimitBytes = fetchedLimit
      logger.info('usage service initialized with plan limit', {
        limitBytes: this.planLimitBytes,
        limitGB: (this.planLimitBytes / 1e9).toFixed(2),
      })
    } else {
      logger.info('usage service initialized with unlimited plan')
    }
  }

  /**
   * fetch current usage from storacha using capability.usage.report
   */
  async getStorachaUsage(
    from: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: Date = new Date(),
  ): Promise<UsageReport> {
    try {
      const currentSpace = this.client.currentSpace()
      if (!currentSpace) throw new Error('no storacha space available')

      const spaceDid = currentSpace.did()
      const report = await this.client.capability.usage.report(spaceDid, {
        from,
        to,
      })

      // report is Record<DID, UsageData>, get the first/only entry
      const usageData = Object.values(report)[0]

      if (!usageData) {
        throw new Error('no usage data returned from storacha')
      }

      return {
        finalSize: usageData.size.final,
        initialSize: usageData.size.initial,
      }
    } catch (error) {
      logger.error('failed to fetch storacha usage report', { error })
      throw new Error('failed to fetch storacha usage')
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
      const [storachaUsage, internalUsage] = await Promise.all([
        this.getStorachaUsage(),
        this.calculateInternalUsage(),
      ])

      const storachaBytes = storachaUsage.finalSize
      const utilization =
        this.planLimitBytes > 0
          ? (storachaBytes / this.planLimitBytes) * 100
          : 0

      await db.insert(usage).values({
        totalBytesStored: internalUsage.totalBytes,
        totalActiveUploads: internalUsage.activeUploads,
        storachaReportedBytes: storachaBytes,
        storachaPlanLimit: this.planLimitBytes,
        utilizationPercentage: utilization,
      })

      logger.info('daily usage snapshot created', {
        totalBytes: internalUsage.totalBytes,
        activeUploads: internalUsage.activeUploads,
        storachaReportedBytes: storachaBytes,
        utilization: `${utilization.toFixed(2)}%`,
      })

      await this.checkThresholds(
        utilization,
        storachaBytes,
        this.planLimitBytes,
      )
    } catch (error) {
      logger.error('failed to create daily snapshot', { error })
      throw error
    }
  }

  /**
   * weekly comparison between our data and the capability report
   */
  async compareUsage(): Promise<void> {
    try {
      const [storachaUsage, internalUsage] = await Promise.all([
        this.getStorachaUsage(),
        this.calculateInternalUsage(),
      ])

      const storachaBytes = storachaUsage.finalSize
      const discrepancy = storachaBytes - internalUsage.totalBytes
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
        storachaReportedBytes: storachaBytes,
        discrepancyBytes: discrepancy,
        discrepancyPercentage,
        status,
        notes:
          status !== 'ok'
            ? `discrepancy of ${(discrepancy / 1e9).toFixed(2)} GB (${discrepancyPercentage.toFixed(2)}%)` // 1e9 = 1GB in bytes
            : null,
      })

      logger.info('usage comparison completed', {
        ourBytes: internalUsage.totalBytes,
        storachaBytes,
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
    utilization: number,
    bytesStored: number,
    planLimit: number,
  ): Promise<void> {
    const thresholds = [
      { level: 80, type: 'threshold_80', alertLevel: 'warning' as const },
      { level: 90, type: 'threshold_90', alertLevel: 'warning' as const },
      { level: 95, type: 'threshold_95', alertLevel: 'critical' as const },
    ]

    for (const threshold of thresholds) {
      if (utilization >= threshold.level) {
        // check if alert already exists and is unresolved
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
        to: WATCHMAN as string | string[],
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
        to: WATCHMAN,
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
