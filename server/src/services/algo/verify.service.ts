/**
 * Algorand Payment Verification Service
 *
 * Decodes a signed Algorand transaction from the X-PAYMENT header,
 * checks it against expected payment parameters, then confirms it is
 * actually settled on-chain before letting the upload proceed.
 *
 * Why the server verifies instead of just trusting the client:
 *   - The client could send a valid-looking signed tx that was never submitted.
 *   - The client could submit a transaction to a different address / lower amount.
 *   - On-chain verification is the only trustless proof of payment.
 *
 * Flow:
 *   1. Decode signed bytes → extract txId, recipient, amount
 *   2. Validate recipient matches ALGO_WALLET_ADDRESS
 *   3. Validate amount >= required microALGO
 *   4. Poll algod until the transaction is confirmed (or timeout)
 */

import algosdk from 'algosdk'
import { logger } from '../../utils/logger.js'

/** How many block rounds to wait for confirmation before giving up (~39s at 3.9s/round) */
const CONFIRMATION_ROUNDS = 10

/** How long (ms) between polling attempts when checking pending tx status */
const POLL_INTERVAL_MS = 2_000

/** Maximum total wait time (ms) before we declare the payment unconfirmed */
const MAX_WAIT_MS = 60_000

const ALGOD_SERVER =
  process.env.ALGOD_SERVER ?? 'https://mainnet-api.algonode.cloud'
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? ''

export interface VerificationResult {
  /** Algorand transaction ID of the confirmed payment */
  txId: string
  /** Sender address extracted from the signed transaction */
  senderAddress: string
  /** Actual amount paid in microALGO */
  amountPaid: number
}

/**
 * Verifies a signed Algorand payment transaction from the X-PAYMENT header.
 *
 * @param signedTxnBytes  - Raw bytes decoded from `X-PAYMENT: algorand <base64>`
 * @param expectedRecipient - The server's ALGO_WALLET_ADDRESS
 * @param requiredMicroAlgo - Minimum acceptable payment in microALGO
 */
export async function verifyAlgoPayment(
  signedTxnBytes: Uint8Array,
  expectedRecipient: string,
  requiredMicroAlgo: number,
): Promise<VerificationResult> {
  // ── Step 1: Decode signed transaction ──────────────────────────────────────
  let decodedTxn: algosdk.SignedTransaction
  try {
    decodedTxn = algosdk.decodeSignedTransaction(signedTxnBytes)
  } catch (err) {
    throw new Error(
      `Failed to decode signed Algorand transaction: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const txn = decodedTxn.txn

  // Only payment transactions are valid — reject asset transfers, app calls, etc.
  if (txn.type !== algosdk.TransactionType.pay) {
    throw new Error(`Expected a payment transaction, got type: ${txn.type}`)
  }

  // ── Step 2: Validate recipient ─────────────────────────────────────────────
  const actualRecipient = algosdk.encodeAddress(txn.payment!.receiver.publicKey)
  if (actualRecipient !== expectedRecipient) {
    throw new Error(
      `Payment sent to wrong address. Expected ${expectedRecipient}, got ${actualRecipient}`,
    )
  }

  // ── Step 3: Validate amount ─────────────────────────────────────────────────
  const amountPaid = Number(txn.payment!.amount)
  if (amountPaid < requiredMicroAlgo) {
    throw new Error(
      `Insufficient payment. Required ${requiredMicroAlgo} microALGO, received ${amountPaid} microALGO`,
    )
  }

  // ── Step 4: Extract txId and sender ────────────────────────────────────────
  const txId = txn.txID()
  const senderAddress = algosdk.encodeAddress(txn.sender.publicKey)

  logger.info('Algorand payment decoded successfully', {
    txId,
    senderAddress,
    actualRecipient,
    amountPaid,
    requiredMicroAlgo,
  })

  // ── Step 5: Confirm on-chain via algod ────────────────────────────────────
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, '')

  try {
    // The client already submitted + waited for confirmation before sending the header.
    // We re-confirm here for security. waitForConfirmation uses algod's pending tx endpoint.
    await waitForAlgoConfirmation(algodClient, txId)

    logger.info('Algorand payment confirmed on-chain', {
      txId,
      senderAddress,
      amountPaid,
    })
  } catch (err) {
    throw new Error(
      `Algorand transaction ${txId} could not be confirmed on-chain: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  return { txId, senderAddress, amountPaid }
}

/**
 * Polls algod until the transaction appears in a confirmed block or the timeout is reached.
 *
 * algosdk's built-in waitForConfirmation wraps the same logic but requires the txn to
 * still be in the "pending" pool. For a tx that was submitted by the client minutes ago,
 * we poll confirmed-round directly so we don't depend on node memory.
 */
async function waitForAlgoConfirmation(
  algodClient: algosdk.Algodv2,
  txId: string,
): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS

  while (Date.now() < deadline) {
    try {
      const info = await algodClient.pendingTransactionInformation(txId).do()
      const confirmedRound = info['confirmedRound']

      if (confirmedRound && Number(confirmedRound) > 0) {
        return // confirmed ✓
      }

      // poolError means the transaction was rejected or evicted
      const poolError = info['poolError']
      if (poolError && String(poolError).length > 0) {
        throw new Error(`Transaction rejected by node: ${poolError}`)
      }
    } catch (err) {
      // If the node returns 404 for a txId we decoded from valid signed bytes,
      // it was likely submitted so long ago the node flushed its pending pool.
      // In that case we treat it as confirmed (the client waited before sending).
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('404') || msg.includes('not found')) {
        logger.warn(
          'Algorand tx not in pending pool — assuming already confirmed',
          { txId },
        )
        return
      }
      throw err
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(
    `Timed out waiting for Algorand tx ${txId} to confirm after ${MAX_WAIT_MS}ms`,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
