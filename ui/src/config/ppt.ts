import { getAddress } from 'viem'
import { arbitrumSepolia } from 'wagmi/chains'

/** Park Pro Token on Arbitrum Sepolia — matches MeshKit gated-access preset. */
export const PPT_TOKEN_ADDRESS =
  '0x38c505EE3FDf02C0A041B08611aDB2F1d92DF410' as const

export const PPT_CHAIN = arbitrumSepolia

export const PPT_CHAIN_ID = arbitrumSepolia.id

/** 1 PPT per MeshKit operation (18 decimals). */
export const PPT_FEE_AMOUNT = 10n ** 18n

export const PPT_DECIMALS = 18

/**
 * Fee recipient. Override with VITE_PPT_TREASURY.
 * Defaults to the Arbitrum Sepolia PPT deployer (EIP-55 checksum).
 * Lowercased before getAddress so mixed-case env values still parse.
 */
const DEFAULT_PPT_TREASURY =
  '0xe98106BFfEd8A04979A351456ad5D2b4eE2dbDe8' as const

export const PPT_TREASURY = getAddress(
  (
    import.meta.env.VITE_PPT_TREASURY || DEFAULT_PPT_TREASURY
  ).toLowerCase() as `0x${string}`,
)

export const PPT_ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
