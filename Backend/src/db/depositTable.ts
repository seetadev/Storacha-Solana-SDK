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
    const userAddres = wallet.toLowerCase();
    const userFiles = await db
      .select()
      .from(depositAccount)
      .where(eq(depositAccount.depositKey, userAddres));
    return userFiles;
  } catch (err) {
    console.log("Error getting user history", err);
    return null;
  }
};
