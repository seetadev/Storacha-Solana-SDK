/**
 * PPT (Park Pro Token) gated-access presets.
 * Matches @ipfs-meshkit/meshkit gated-access networks (Arbitrum Sepolia).
 */

export const PPT_TOKEN_ADDRESS =
  '0x38c505EE3FDf02C0A041B08611aDB2F1d92DF410' as const

export const PPT_CHAIN_ID = 421614

export const PPT_RPC_URL =
  process.env.PPT_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc'

/** 1 PPT per gated operation (18 decimals). */
export const PPT_FEE_AMOUNT = 10n ** 18n

export const PPT_DECIMALS = 18

export const PPT_PAYMENT_CHAIN = 'arb-sep'

export const PPT_PAYMENT_TOKEN = 'PPT'

/**
 * Treasury that receives PPT fees.
 * Defaults to the Arbitrum Sepolia PPT deployer when PPT_TREASURY is unset.
 * EIP-55 checksum: 0xe98106BFfEd8A04979A351456ad5D2b4eE2dbDe8
 */
const DEFAULT_PPT_TREASURY =
  '0xe98106BFfEd8A04979A351456ad5D2b4eE2dbDe8' as const

export function getPptTreasury(): `0x${string}` {
  const fromEnv = process.env.PPT_TREASURY?.trim()
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) {
    return fromEnv as `0x${string}`
  }
  return DEFAULT_PPT_TREASURY
}
