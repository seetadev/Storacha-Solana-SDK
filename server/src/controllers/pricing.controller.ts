import { Request, Response } from 'express'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { QuoteOutput } from '../types.js'
import { logger } from '../utils/logger.js'
import { getQuoteForFileUpload } from '../utils/storacha.js'

/**
 * Function to get Quote For File Upload
 * @param req Request
 * @param res Response
 * @returns quoteObject || null and success
 */
export const GetQuoteForFileUpload = async (req: Request, res: Response) => {
  try {
    const duration = parseInt(req.query.duration as string, 10)
    const size = parseInt(req.query.size as string, 10)
    const QuoteObject: QuoteOutput = await getQuoteForFileUpload({
      durationInUnits: duration,
      sizeInBytes: size,
    })
    return res.status(200).json({
      quote: QuoteObject,
      success: true,
    })
  } catch (err) {
    logger.error('Error getting file upload quote', {
      error: err instanceof Error ? err.message : String(err),
    })
    return res.status(400).json({
      quoteObject: null,
      success: false,
    })
  }
}

export const getSolUsdPrice = async (_req: Request, res: Response) => {
  try {
    const price = await getSolPrice()
    return res.status(200).json({
      price,
      timestamp: Date.now,
    })
  } catch (error) {
    logger.error('Error getting SOL/USD price', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({ message: 'Failed to get SOL/USD price' })
  }
}
