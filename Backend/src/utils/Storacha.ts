import { create } from "@storacha/client";
import * as Client from "@storacha/client";
import { StoreMemory } from "@storacha/client/stores/memory";
import * as Proof from "@storacha/client/proof";
import { Signer } from "@storacha/client/principal/ed25519";
import { QuoteInput } from "../types/StorachaTypes.js";
import { ADMIN_CONFIG } from "../config/config.js";
import { db } from "../db/db.js";
import { configTable } from "../db/schema.js";

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
      MINIMUM_DURATION_UNIT: configTable.min_duration_days,
      RATE_PER_BYTE_PER_UNIT: configTable.rate_per_byte_per_day,
    })
    .from(configTable); // e.g. in SOL; or use lamports: 1000 lamports/byte/day
  const { MINIMUM_DURATION_UNIT, RATE_PER_BYTE_PER_UNIT } = data[0];
  const effectiveDuration = Math.max(durationInUnits, MINIMUM_DURATION_UNIT);
  const totalCost = sizeInBytes * effectiveDuration * RATE_PER_BYTE_PER_UNIT;

  return {
    effectiveDuration,
    ratePerBytePerDay: RATE_PER_BYTE_PER_UNIT,
    totalCost,
  };
};

/**
 * This function is used to decode a delegation which is provided as a proof by a certain agent to access a space
 */

export const DecodeDelegations = () => {};
