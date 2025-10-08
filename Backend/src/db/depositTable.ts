import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { depositAccount } from "./schema.js";
import { FILES_DEPOSIT_DATA } from "../utils/constant.js";

/**
 *
 * @param wallet
 * @returns
 */
export const getUserHistory = async (wallet: string) => {
  try {
    const userAddres = wallet.toLowerCase();
    // const userFiles = await db
    //   .select()
    //   .from(depositAccount)
    //   .where(eq(depositAccount.deposit_key, userAddres));
    return FILES_DEPOSIT_DATA;
  } catch (err) {
    console.log("Error getting user history", err);
    return null;
  }
};
