import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { PaginationContext } from '../types.js'
import { logger } from '../utils/logger.js'
import { db } from './db.js'
import { transaction, uploads } from './schema.js'

type TransactionData = {
  depositId: number
  contentCid: string
  transactionHash: string
  transactionType: 'initial_deposit' | 'renewal'
  amountInLamports: number
  durationDays: number
}

/**
 * Get transactions related to a user addresss
 * @param wallet
 * @param page
 * @param limit
 * @param ctx - Pagination context for building next/prev URLs
 * @returns
 */

export const getUserHistory = async (
  wallet: string,
  page = 1,
  limit = 20,
  chain: string = 'sol',
  ctx?: PaginationContext,
) => {
  try {
    const userAddress = wallet
    const offset = (page - 1) * limit

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(uploads)
      .where(
        and(
          eq(uploads.depositKey, userAddress),
          eq(uploads.paymentChain, chain)
        )
      )

    const data = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.depositKey, userAddress),
          eq(uploads.paymentChain, chain)
        )
      )
      .orderBy(desc(uploads.createdAt))
      .limit(limit)
      .offset(offset)

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)

    const buildPageUrl = (p: number) =>
      `${ctx?.baseUrl}${ctx?.path}?userAddress=${userAddress}&page=${p}&limit=${limit}&chain=${chain}`

    return {
      data,
      total,
      page,
      pageSize: limit,
      totalPages,
      next: page < totalPages ? buildPageUrl(page + 1) : null,
      prev: page > 1 ? buildPageUrl(page - 1) : null,
    }
  } catch (err) {
    logger.error('Error getting user history', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Find uploads that will expire in X days and haven't been warned yet
 * @param daysUntilExpiration - Number of days before expiration to warn (default: 7)
 * @returns Array of uploads that need warning emails
 */
const getUploadsNeedingWarning = async (daysUntilExpiration: number = 7) => {
  try {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysUntilExpiration)
    const targetDateString = targetDate.toISOString().split('T')[0]

    const results = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.deletionStatus, 'active'),
          lte(sql`DATE(${uploads.expiresAt})`, sql`DATE(${targetDateString})`),
          sql`${uploads.userEmail} IS NOT NULL`,
          sql`${uploads.userEmail} != ''`,
          sql`${uploads.warningSentAt} IS NULL`,
        ),
      )

    return results
  } catch (err) {
    logger.error('Error getting uploads needing warning', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Group uploads by user email for batched expiration warnings
 * @param daysUntilExpiration - Number of days before expiration to warn (default: 7)
 * @returns Map of email addresses to their expiring uploads
 */
export const getUploadsGroupedByEmail = async (
  daysUntilExpiration: number = 7,
) => {
  try {
    const uploadsList = await getUploadsNeedingWarning(daysUntilExpiration)
    if (!uploadsList) return null

    const grouped = new Map<string, typeof uploadsList>()

    for (const upload of uploadsList) {
      if (!upload.userEmail) continue

      const existing = grouped.get(upload.userEmail) || []
      existing.push(upload)
      grouped.set(upload.userEmail, existing)
    }

    return grouped
  } catch (err) {
    logger.error('Error grouping uploads by email', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Find deposits that have already expired
 * @returns Array of expired deposits
 */
export const getExpiredDeposits = async () => {
  try {
    const now = new Date().toISOString().split('T')[0]

    const deposits = await db
      .select()
      .from(uploads)
      .where(
        and(
          sql`DATE(${uploads.expiresAt}) < DATE(${now})`,
          sql`${uploads.deletionStatus} IN ('active', 'warned')`,
        ),
      )

    return deposits
  } catch (err) {
    logger.error('Error getting expired deposits', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Update the deletion status of a deposit
 * @param depositId - The ID of the deposit
 * @param status - New deletion status ('active' | 'warned' | 'deleted')
 * @returns Updated deposit record
 */
export const updateDeletionStatus = async (
  depositId: number,
  status: 'active' | 'warned' | 'deleted',
) => {
  try {
    const updated = await db
      .update(uploads)
      .set({ deletionStatus: status })
      .where(eq(uploads.id, depositId))
      .returning()

    return updated[0] || null
  } catch (err) {
    logger.error('Error updating deletion status', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Batch update warningSentAt for multiple deposits
 * @param depositIds - Array of deposit IDs
 * @returns Number of updated records
 */
export const batchUpdateWarningSentAt = async (depositIds: number[]) => {
  try {
    const now = new Date().toISOString()
    const updated = await db
      .update(uploads)
      .set({
        warningSentAt: now,
        deletionStatus: 'warned',
      })
      .where(inArray(uploads.id, depositIds))
      .returning()

    return updated.length
  } catch (err) {
    logger.error('Error batch updating warningSentAt', {
      error: err instanceof Error ? err.message : String(err),
    })
    return 0
  }
}

/**
 *
 * @param cid - CID of the upload/deposit to renew
 * @param duration - Number of additional days to extend storage for.
 * @returns Updated uplaod information
 */
export const renewStorageDuration = async (cid: string, duration: number) => {
  try {
    const existingUpload = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (!existingUpload || existingUpload.length === 0) {
      logger.warn('File upload with CID does not exist', { cid })
      return null
    }

    const deposit = existingUpload[0]

    const uploadExpirationDate = deposit.expiresAt
      ? new Date(deposit.expiresAt)
      : new Date()
    const today = new Date()
    const baseDate = uploadExpirationDate > today ? uploadExpirationDate : today
    baseDate.setUTCDate(baseDate.getDate() + duration)
    const newStorageExpirationDate = baseDate.toISOString().split('T')[0]

    const newDuration = deposit.durationDays + duration
    const deposits = await db
      .update(uploads)
      .set({
        durationDays: newDuration,
        deletionStatus: 'active',
        warningSentAt: null,
        expiresAt: newStorageExpirationDate,
      })
      .where(eq(uploads.contentCid, cid))
      .returning()

    return deposits[0] || null
  } catch (error) {
    logger.error('Failed to renew storage duration', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Save a transaction for an upload
 */
export const saveTransaction = async (data: TransactionData) => {
  try {
    const result = await db
      .insert(transaction)
      .values({
        depositId: data.depositId,
        contentCid: data.contentCid,
        transactionHash: data.transactionHash,
        transactionType: data.transactionType,
        amountInLamports: data.amountInLamports,
        durationDays: data.durationDays,
      })
      .returning()

    return result[0] || null
  } catch (err) {
    logger.error('Error saving transaction', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Get all transactions for an upload (by deposit ID)
 * Internal helper used by getTransactionsForCID
 */
const getUploadTransactions = async (depositId: number) => {
  try {
    const transactions = await db
      .select()
      .from(transaction)
      .where(eq(transaction.depositId, depositId))
      .orderBy(transaction.createdAt)

    return transactions
  } catch (err) {
    logger.error('Error getting upload transactions', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Get all transactions for a specific CID
 */
export const getTransactionsForCID = async (cid: string) => {
  try {
    const deposit = await db
      .select()
      .from(uploads)
      .where(eq(uploads.contentCid, cid))
      .limit(1)

    if (!deposit || deposit.length === 0) return null

    return await getUploadTransactions(deposit[0].id)
  } catch (err) {
    logger.error('Error getting transactions for CID', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
