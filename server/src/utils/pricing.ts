import { db } from '../db/db.js'
import { configTable } from '../db/schema.js'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { QuoteInput } from '../types.js'
import { getAmountInLamportsFromUSD, getAmountInUSD } from './constant.js'
import { logger } from './logger.js'

/**
 * This function returns the amount it will cost to upload the file, keep it for minimum duration
 */
export const getQuoteForFileUpload = async ({
  durationInUnits,
  sizeInBytes,
  chain = 'sol',
}: QuoteInput) => {
  const data = await db
    .select({
      MINIMUM_DURATION_UNIT: configTable.minDurationDays,
      RATE_PER_BYTE_PER_UNIT: configTable.ratePerBytePerDay,
    })
    .from(configTable)

  if (!data || data.length === 0)
    throw new Error('Config not found in database')

  const { MINIMUM_DURATION_UNIT, RATE_PER_BYTE_PER_UNIT } = data[0]
  const effectiveDuration = Math.max(durationInUnits, MINIMUM_DURATION_UNIT)

  let totalCost: number

  if (chain === 'fil') {
    totalCost = getAmountInUSD(
      sizeInBytes,
      RATE_PER_BYTE_PER_UNIT,
      effectiveDuration,
    )
  } else {
    const solPrice = await getSolPrice()
    totalCost = getAmountInLamportsFromUSD(
      sizeInBytes,
      RATE_PER_BYTE_PER_UNIT,
      effectiveDuration,
      solPrice,
    )
  }

  return {
    effectiveDuration,
    ratePerBytePerDay: RATE_PER_BYTE_PER_UNIT,
    totalCost,
  }
}

/**
 * Returns pricing config from database
 * @returns Rate per byte per day and minimum duration
 */
export const getPricingConfig = async () => {
  try {
    const data = await db
      .select({
        minDurationDays: configTable.minDurationDays,
        ratePerBytePerDay: configTable.ratePerBytePerDay,
      })
      .from(configTable)
      .limit(1)

    if (!data || data.length === 0)
      throw new Error('Pricing config not found in database')

    return {
      minDurationDays: data[0].minDurationDays,
      ratePerBytePerDay: data[0].ratePerBytePerDay,
    }
  } catch (error) {
    logger.error('Error fetching pricing config from database', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
