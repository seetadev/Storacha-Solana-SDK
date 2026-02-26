import fetch from 'node-fetch'
import { logger } from '../../utils/logger.js'

const FILECOIN_RPC = {
  mainnet: 'https://api.node.glif.io/rpc/v1',
  calibration: 'https://api.calibration.node.glif.io/rpc/v1',
} as const

const USDFC_CONTRACT = {
  mainnet: '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045',
  calibration: '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0',
} as const

// keccak256("Transfer(address,address,uint256)")
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

/** how long to wait for the tx to be mined (ms) */
const RECEIPT_TIMEOUT_MS = 120_000
/** how often to poll for the receipt (ms) */
const RECEIPT_POLL_INTERVAL_MS = 5_000

function getNetwork(): 'mainnet' | 'calibration' {
  const network = process.env.FILECOIN_NETWORK
  if (network !== 'mainnet' && network !== 'calibration') {
    throw new Error('Invalid FILECOIN_NETWORK configuration')
  }
  return network
}

export function getUsdfcContractAddress(): string {
  return USDFC_CONTRACT[getNetwork()]
}

function getRpcUrl(): string {
  return FILECOIN_RPC[getNetwork()]
}

interface VerifyTransferArgs {
  transactionHash: string
  from: string
  to: string
  contractAddress: string
  expectedAmount: bigint
}

interface VerifyResult {
  verified: boolean
  actualAmount?: bigint
}

interface RpcReceipt {
  status: string
  logs: Array<{
    address: string
    topics: string[]
    data: string
  }>
}

/**
 * get a transaction receipt from the Filecoin EVM RPC.
 * returns null if the transaction hasn't been mined yet.
 */
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
    throw new Error(`Filecoin RPC request failed: ${response.status}`)
  }

  const data = (await response.json()) as { result: RpcReceipt | null }
  return data.result
}

/**
 * poll for a transaction receipt until it appears or the timeout is reached.
 * filecoin has ~30s block times, so we poll every 5s for up to 120s.
 */
async function waitForReceipt(
  rpcUrl: string,
  txHash: string,
): Promise<RpcReceipt | null> {
  const deadline = Date.now() + RECEIPT_TIMEOUT_MS

  while (Date.now() < deadline) {
    const receipt = await getReceipt(rpcUrl, txHash)
    if (receipt) return receipt

    logger.info('USDFC verify: receipt not yet available, polling...', {
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
 * verify an ERC-20 transfer by reading the transaction receipt directly from
 * the Filecoin EVM RPC. polls until the receipt is available (up to 120s)
 * to handle Filecoin's ~30s block times.
 */
export async function verifyErc20Transfer(
  args: VerifyTransferArgs,
): Promise<VerifyResult> {
  const rpcUrl = getRpcUrl()

  const receipt = await waitForReceipt(rpcUrl, args.transactionHash)

  if (!receipt) {
    logger.warn('USDFC verify: no receipt after timeout', {
      txHash: args.transactionHash,
    })
    return { verified: false }
  }

  if (receipt.status !== '0x1') {
    logger.warn('USDFC verify: transaction failed on-chain', {
      txHash: args.transactionHash,
      status: receipt.status,
    })
    return { verified: false }
  }

  for (const log of receipt.logs) {
    if (log.topics[0] !== ERC20_TRANSFER_TOPIC) continue
    if (log.address.toLowerCase() !== args.contractAddress.toLowerCase())
      continue

    const logFrom = '0x' + (log.topics[1] || '').slice(26)
    const logTo = '0x' + (log.topics[2] || '').slice(26)

    if (logFrom.toLowerCase() !== args.from.toLowerCase()) continue
    if (logTo.toLowerCase() !== args.to.toLowerCase()) continue

    const actualAmount = BigInt(log.data)

    if (actualAmount >= args.expectedAmount) {
      logger.info('USDFC payment verified', {
        txHash: args.transactionHash,
        actualAmount: actualAmount.toString(),
        expectedAmount: args.expectedAmount.toString(),
      })
      return { verified: true, actualAmount }
    }
  }

  logger.warn('USDFC verify: no matching transfer event', {
    txHash: args.transactionHash,
    logsCount: receipt.logs.length,
  })
  return { verified: false }
}
