/**
 * ALGO Price Service
 *
 * Fetches the live ALGO/USD exchange rate from CoinGecko's free public API.
 * Mirrors the structure of sol-price.service.ts so the codebase stays consistent.
 *
 * CoinGecko free tier: 10-30 req/min. The 60-second cache keeps us well within limits.
 * For high-traffic production use, swap the URL for a paid CoinGecko or Pyth endpoint.
 * Pyth does support ALGO/USD: feed id 0x08f781a893bc9340140c5f89c8a96f438bcfae4d1474cc0f688e3a52892c7318
 */

import { logger } from '../../utils/logger.js'

interface PriceCache {
  price: number
  timestamp: number
}

const CACHE_TTL_MS = 60 * 1000 // 60 seconds — same TTL as SOL price service
let priceCache: PriceCache | null = null

// CoinGecko simple-price endpoint — no API key required for the free tier
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd'

/**
 * Returns the current ALGO/USD price.
 * Results are cached for 60 seconds to avoid hammering CoinGecko on every upload request.
 *
 * Falls back to the last known cached price if the upstream call fails.
 * Throws only if there is no cache at all and the request fails.
 */
export async function getAlgoPrice(): Promise<number> {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
    return priceCache.price
  }

  try {
    const res = await fetch(COINGECKO_URL)
    if (!res.ok)
      throw new Error(`CoinGecko responded with status ${res.status}`)

    const data = (await res.json()) as { algorand?: { usd?: number } }
    const price = data.algorand?.usd

    if (typeof price !== 'number' || price <= 0 || !Number.isFinite(price)) {
      throw new Error(`Unexpected ALGO price value: ${price}`)
    }

    priceCache = { price, timestamp: Date.now() }
    logger.info('ALGO price refreshed', { price })
    return price
  } catch (error) {
    logger.error('Failed to fetch ALGO price from CoinGecko', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (priceCache) {
      logger.warn('Falling back to stale ALGO price cache', {
        cachedPrice: priceCache.price,
        ageMs: Date.now() - priceCache.timestamp,
      })
      return priceCache.price
    }

    throw new Error(
      'Unable to get ALGO price — no cache and upstream call failed',
    )
  }
}
