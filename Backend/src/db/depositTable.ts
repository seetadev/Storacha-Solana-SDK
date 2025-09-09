import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { depositAccount } from "./schema.js";

/**
 *
 * @param wallet
 * @returns
 */
export const getUserHistory = async (wallet: string) => {
  try {
    const userFiles = await db
      .select()
      .from(depositAccount)
      .where(eq(depositAccount.deposit_key, wallet));
    return userFiles;
  } catch (err) {
    console.log("Error getting user history",err);
    return null;
  }
};
