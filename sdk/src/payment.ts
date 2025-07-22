import { Address, getProgramDerivedAddress } from "@solana/kit"
import { FeeEstimationArgs, OnChainConfig } from "./types"
import { publicKey, struct, u32, u64 } from "@coral-xyz/borsh"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"

const PROGRAM_ADDRESS = 'dummy_program_address' as Address // this should provided by dhruv(?). need to sync.
const CONFIG_SEED = 'config' // dummy stuff here too

const configLayout = struct([
  publicKey('admin'),
  u64('ratePerBytePerDay'),
  u32('minDurationDays'),
  publicKey('withdrawalWallet')
])

function decodeConfigAccount(data: Buffer): OnChainConfig {
  const decoded = configLayout.decode(data)
  return {
    ratePerBytePerDay: decoded.ratePerBytePerDay,
    withdrawalWallet: decoded.withdrawalWallet.toBase58() as Address,
    minDurationDays: decoded.minDurationDays
  }
}

/**Estimate total storage cost in lamports for a file upload based on its size and duration
 *
 * This reads the on-chain `ConfigAccount` to fetch the current rate per byte per day, and multiplies
 * it by the input file size and how long the file will be stored for to compute the fee.
 *
 * Lamports are the atomic unit for SOL, where 1 SOL has round a billion (1,000,000,000) lamports.
 *
 * @param args - The fee estimation input values.
 * @param args.size - Size of the file in bytes.
 * @param args.durationDays - Duration (in days) to store the file.
 * @param args.rpcUrl - Optional RPC URL, defaults to Solana Devnet
 *
 * @returns The estimated storage fee in lamports (as bigint).
 *
 * @throws If the on-chain `ConfigAccount` cannot be fetched or decoded.
 */
export async function estimateFees(args: FeeEstimationArgs): Promise<bigint>  {
  const connection = new Connection(args.rpcUrl ?? clusterApiUrl('devnet'), 'confirmed' )

  const [configpda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [CONFIG_SEED]
  })

  const accountInfo = await connection.getAccountInfo(new PublicKey(configpda))
  if (!accountInfo) throw new Error('ConfigAccount not found on-chain')

  const config = decodeConfigAccount(accountInfo.data)
  const rate = BigInt(config.ratePerBytePerDay)
  const fee = BigInt(args.size) * BigInt(args.durationDays) * rate

  return fee
}
