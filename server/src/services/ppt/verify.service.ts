import fetch from 'node-fetch'
import {
  PPT_FEE_AMOUNT,
  PPT_RPC_URL,
  PPT_TOKEN_ADDRESS,
  getPptTreasury,
} from '../../utils/ppt/constants.js'
import { logger } from '../../utils/logger.js'

// keccak256("Transfer(address,address,uint256)")
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const RECEIPT_TIMEOUT_MS = 90_000
const RECEIPT_POLL_INTERVAL_MS = 2_000

interface RpcReceipt {
  status: string
  logs: Array<{
    address: string
    topics: string[]
    data: string
  }>
}

export interface VerifyPptPaymentArgs {
  transactionHash: string
  from: string
  /** Defaults to PPT_TREASURY / deployer */
  to?: string
  /** Defaults to 1 PPT */
  expectedAmount?: bigint
}

export interface VerifyPptResult {
  verified: boolean
  actualAmount?: bigint
  reason?: string
}

async function getReceipt(
  rpcUrl: string,
  txHash: string,
): Promise<RpcReceipt | null> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Arbitrum Sepolia RPC failed: ${response.status}`)
  }

  const data = (await response.json()) as { result: RpcReceipt | null }
  return data.result
}

async function waitForReceipt(
  rpcUrl: string,
  txHash: string,
): Promise<RpcReceipt | null> {
  const deadline = Date.now() + RECEIPT_TIMEOUT_MS

  while (Date.now() < deadline) {
    const receipt = await getReceipt(rpcUrl, txHash)
    if (receipt) return receipt

    logger.info('PPT verify: waiting for receipt', {
      txHash,
      remainingMs: deadline - Date.now(),
    })

    await new Promise((resolve) =>
      setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS),
    )
  }

  return null
}

/**
 * Verify a PPT ERC-20 Transfer on Arbitrum Sepolia.
 * Expects Transfer(from → treasury) for at least `expectedAmount` (default 1 PPT).
 */
export async function verifyPptPayment(
  args: VerifyPptPaymentArgs,
): Promise<VerifyPptResult> {
  const to = (args.to ?? getPptTreasury()).toLowerCase()
  const from = args.from.toLowerCase()
  const expectedAmount = args.expectedAmount ?? PPT_FEE_AMOUNT
  const txHash = args.transactionHash

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { verified: false, reason: 'invalid_tx_hash' }
  }

  const receipt = await waitForReceipt(PPT_RPC_URL, txHash)

  if (!receipt) {
    logger.warn('PPT verify: no receipt after timeout', { txHash })
    return { verified: false, reason: 'receipt_timeout' }
  }

  if (receipt.status !== '0x1') {
    logger.warn('PPT verify: transaction reverted', { txHash })
    return { verified: false, reason: 'tx_reverted' }
  }

  for (const log of receipt.logs) {
    if (log.topics[0] !== ERC20_TRANSFER_TOPIC) continue
    if (log.address.toLowerCase() !== PPT_TOKEN_ADDRESS.toLowerCase()) continue

    const logFrom = ('0x' + (log.topics[1] || '').slice(26)).toLowerCase()
    const logTo = ('0x' + (log.topics[2] || '').slice(26)).toLowerCase()

    if (logFrom !== from) continue
    if (logTo !== to) continue

    const actualAmount = BigInt(log.data)

    if (actualAmount >= expectedAmount) {
      logger.info('PPT payment verified', {
        txHash,
        actualAmount: actualAmount.toString(),
        expectedAmount: expectedAmount.toString(),
      })
      return { verified: true, actualAmount }
    }
  }

  logger.warn('PPT verify: no matching Transfer event', {
    txHash,
    from,
    to,
    logsCount: receipt.logs.length,
  })
  return { verified: false, reason: 'no_matching_transfer' }
}

/** Pure helper for unit tests — parse Transfer amount from log data hex. */
export function parseTransferAmount(data: string): bigint {
  return BigInt(data)
}
