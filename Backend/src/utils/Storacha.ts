import * as Client from "@web3-storage/w3up-client";
import { StoreMemory } from "@web3-storage/w3up-client/stores/memory";
import * as Proof from "@web3-storage/w3up-client/proof";
import { Signer } from "@web3-storage/w3up-client/principal/ed25519";
import { QuoteInput } from "../types/StorachaTypes";
import { ADMIN_CONFIG } from "../config/config";

/**
 * Initializes a Storacha client using user-provided key and proof.
 *
 * @param {string} key - The base64-encoded private key string.
 * @param {string} proofStr - The UCAN proof string.
 * @returns {Promise<Client.Client>} Initialized W3UP client
 */
export async function initStorachaClient(
  key: string,
  proofStr: string
): Promise<Client.Client> {
  const principal = Signer.parse(key);
  const store = new StoreMemory();
  const client = await Client.create({ principal, store });

  const proof = await Proof.parse(proofStr);
  const space = await client.addSpace(proof);

  await client.setCurrentSpace(space.did());

  return client;
}

/**
 * This function returns the amount it will cost to upload the file, keep it for minimum duration
 */
export const getQuoteForFileUpload = ({
  durationInUnits,
  sizeInBytes,
}: QuoteInput) => {
  const MINIMUM_DURATION_UNIT = ADMIN_CONFIG.minimumDuration;
  const RATE_PER_BYTE_PER_UNIT = ADMIN_CONFIG.rate; // e.g. in SOL; or use lamports: 1000 lamports/byte/day

  const effectiveDuration = Math.max(durationInUnits, MINIMUM_DURATION_UNIT);
  const totalCost = sizeInBytes * effectiveDuration * RATE_PER_BYTE_PER_UNIT;

  return {
    effectiveDuration,
    ratePerBytePerDay: RATE_PER_BYTE_PER_UNIT,
    totalCost,
  };
};

/**
 * This function is used to deode a delegation which is provided as a proof by a certain agent to access a space
 */

export const DecodeDelegations = () => {};
