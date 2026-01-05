export const DAY_TIME_IN_SECONDS = 86400;

/** 1 SOL in Lamports */
export const ONE_BILLION_LAMPORTS = 1_000_000_000;

/**
 * Computes the new expiration date based on teh duration provided
 *
 * @param expirationDate - the current expiration date of an upload
 * @param duration - the new duration to renew storage for
 * @returns a new date in the future in this format dd-mm-yyy
 */
export const getNewStorageExpirationDate = (
  expirationDate: string,
  duration: number,
): string => {
  const uploadExpirationDate = expirationDate
    ? new Date(expirationDate)
    : new Date();

  const today = new Date();
  const baseDate = uploadExpirationDate > today ? uploadExpirationDate : today;
  baseDate.setUTCDate(baseDate.getDate() + duration);
  const newStorageExpirationDate = baseDate.toISOString().split("T")[0];

  return newStorageExpirationDate;
};

/**
 *
 * @param fileSize - size of the file
 * @param rate - rate per byte of a file per day (in lamports)
 * @param duration - storage duration
 * @returns amount in lamports
 */
export const getAmountInLamports = (
  fileSize: number,
  rate: number,
  duration: number,
): number => {
  const amountInLamports = fileSize * duration * rate;
  return amountInLamports;
};

/**
 * Calculates storage cost in lamports from USD rate
 *
 * @param fileSize - size of the file in bytes
 * @param rateInUSD - rate per byte per day in USD
 * @param duration - storage duration in days
 * @param solPriceUSD - current SOL price in USD
 * @returns amount in lamports
 */
export const getAmountInLamportsFromUSD = (
  fileSize: number,
  rateInUSD: number,
  duration: number,
  solPriceUSD: number,
): number => {
  const costInUSD = fileSize * duration * rateInUSD;

  const costInSOL = costInUSD / solPriceUSD;
  const amountInLamports = costInSOL * ONE_BILLION_LAMPORTS;

  return Math.ceil(amountInLamports);
};

/**
 *
 * @param lamports
 * @returns The SOL equivalent
 */
export const getAmountInSOL = (lamports: number): number =>
  lamports / ONE_BILLION_LAMPORTS;
