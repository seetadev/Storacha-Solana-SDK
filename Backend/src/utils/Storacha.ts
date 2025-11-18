import * as Client from "@storacha/client";
import { create } from "@storacha/client";
import { Signer } from "@storacha/client/principal/ed25519";
import * as Proof from "@storacha/client/proof";
import { StoreMemory } from "@storacha/client/stores/memory";
import { db } from "../db/db.js";
import { configTable } from "../db/schema.js";
import { QuoteInput } from "../types/StorachaTypes.js";

/**
 * Initializes a Storacha client using user-provided key and proof.
 *
 * @returns {Promise<Client.Client>} Initialized W3UP client
 */
export async function initStorachaClient(): Promise<Client.Client> {
  const principal = Signer.parse(process.env.STORACHA_KEY!);
  const store = new StoreMemory();
  const client = await create({ principal, store });

  const proof = await Proof.parse(process.env.STORACHA_PROOF!);
  const space = await client.addSpace(proof);

  await client.setCurrentSpace(space.did());

  return client;
}

/**
 * This function returns the amount it will cost to upload the file, keep it for minimum duration
 */
export const getQuoteForFileUpload = async ({
  durationInUnits,
  sizeInBytes,
}: QuoteInput) => {
  const data = await db
    .select({
      MINIMUM_DURATION_UNIT: configTable.minDurationDays,
      RATE_PER_BYTE_PER_UNIT: configTable.ratePerBytePerDay,
    })
    .from(configTable); // e.g. in SOL; or use lamports: 1000 lamports/byte/day
  const { MINIMUM_DURATION_UNIT, RATE_PER_BYTE_PER_UNIT } = data?.[0];
  const effectiveDuration = Math.max(durationInUnits, MINIMUM_DURATION_UNIT);
  const totalCost = sizeInBytes * effectiveDuration * RATE_PER_BYTE_PER_UNIT;

  return {
    effectiveDuration,
    ratePerBytePerDay: RATE_PER_BYTE_PER_UNIT,
    totalCost,
  };
};

/**
 * Returns Admin Data for Solana
 * @returns
 */
export const getAdminDataForSolana = async () => {
  try {
    const data = await db
      .select({
        MINIMUM_DURATION_UNIT: configTable.minDurationDays,
        RATE_PER_BYTE_PER_UNIT: configTable.ratePerBytePerDay,
      })
      .from(configTable);
    const { MINIMUM_DURATION_UNIT, RATE_PER_BYTE_PER_UNIT } = data?.[0];
    return { MINIMUM_DURATION_UNIT, RATE_PER_BYTE_PER_UNIT };
  } catch (error) {
    console.log("Error fetching admin info from the databse", error);
  }
};
