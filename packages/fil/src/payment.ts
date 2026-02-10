// TODO:
// Signature / transaction types will be replaced with Filecoin equivalents.

/**
 * Creates a storage deposit.
 *
 * TODO:
 * Previously created and sent a Solana transaction.
 * We will reuse the same API-driven flow for Filecoin message creation & signing.
 */
export async function createDepositTxn() {}

/**
 * Get cost estimate for renewing storage duration
 *
 * NOTE:
 * This is chain-agnostic and requires no Solana changes.
 */
export async function getStorageRenewalCost() {}

/**
 * Renew storage duration for an existing upload
 *
 * TODO:
 * Replace Solana transaction with Filecoin renewal message
 */
export async function renewStorageTxn() {}
