/**
 * SOL Price Service
 *
 * Helps us get realtime SOL/USD price ticks using Pyth network.
 */

import { HermesClient } from "@pythnetwork/hermes-client";

interface PriceCache {
  price: number;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 secs
let priceCache: PriceCache | null = null;

// This is a unique idebtifier for each specific pair of assets. SOL/USD, inour case.
const SOL_USD_PRICE_FEED_ID =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

const hermesClient = new HermesClient("https://hermes.pyth.network", {});

/**
 * This is used to retrieve the SOL/USD price feed dynamically instead using an hardcoded hash
 * Although, there's a high tendency that the feedId may not even change.
 * This is just safer.
 */
export async function getSolPrice(): Promise<number> {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS)
    return priceCache.price;

  try {
    const priceData = await hermesClient.getLatestPriceUpdates([
      SOL_USD_PRICE_FEED_ID,
    ]);

    if (!priceData.parsed || priceData.parsed.length === 0)
      throw new Error("No price data returned");
    const data = priceData.parsed[0];

    // pyth.network returns price as a string with an exponent
    // price could be "13392000000", expo=-8 means 133.92 USD
    const priceValue = parseFloat(data.price.price);
    const exponent = data.price.expo;
    const price = priceValue * Math.pow(10, exponent);

    if (typeof price !== "number" || price <= 0 || !isFinite(price))
      throw new Error("Invalid price");

    priceCache = {
      price,
      timestamp: Date.now(),
    };

    return price;
  } catch (error) {
    console.error("Faile to fetch SOL price", error);
    if (priceCache) {
      console.warn("Falling back to stale price data due to an error");
      return priceCache.price;
    }

    throw new Error("Unable to get SOL price");
  }
}

/**
 * Converts USD amount to SOL
 */
export function usdToSol(usdAmount: number, solPrice: number): number {
  if (solPrice <= 0) throw new Error("Invalid SOL price");
  return usdAmount / solPrice;
}

/**
 * Converts SOL amount to USD
 */
export function solToUsd(solAmount: number, solPrice: number): number {
  return solAmount * solPrice;
}
