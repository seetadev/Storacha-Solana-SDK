import { useCallback, useState } from 'react'
import {
  useAccount,
  useConnect,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import {
  PPT_CHAIN_ID,
  PPT_ERC20_ABI,
  PPT_FEE_AMOUNT,
  PPT_TOKEN_ADDRESS,
  PPT_TREASURY,
} from '@/config/ppt'

/**
 * Pay 1 PPT on Arbitrum Sepolia for a MeshKit operation.
 * Returns the confirmed transaction hash.
 */
export function usePptPayment() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: PPT_CHAIN_ID })
  const {
    writeContractAsync,
    data: pendingHash,
    isPending: isWriting,
    reset,
  } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
  })

  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(() => {
    const injector = connectors.find((c) => c.id === 'injected')
    if (injector) {
      connect({ connector: injector, chainId: PPT_CHAIN_ID })
    }
  }, [connect, connectors])

  const ensureChain = useCallback(async () => {
    if (chainId !== PPT_CHAIN_ID) {
      await switchChainAsync({ chainId: PPT_CHAIN_ID })
    }
  }, [chainId, switchChainAsync])

  const payOnePpt = useCallback(async (): Promise<`0x${string}`> => {
    setError(null)

    if (!address) {
      throw new Error('Connect MetaMask on Arbitrum Sepolia first')
    }

    await ensureChain()

    // Arbitrum Sepolia baseFee (~0.06 gwei) drifts between estimation and
    // inclusion, so viem/MetaMask defaults land just under baseFee.
    // Anchor to the LIVE baseFee and 2x it: still <$0.01, never underpays.
    if (!publicClient) {
      console.warn('[ppt] no publicClient, using wallet fee defaults')
    } else {
      const block = await publicClient.getBlock()
      const liveBaseFee = block.baseFeePerGas ?? 0n
      const est = await publicClient.estimateFeesPerGas().catch(() => null)
      const priority =
        est?.maxPriorityFeePerGas && est.maxPriorityFeePerGas > 0n
          ? est.maxPriorityFeePerGas
          : 1_000_000n // 0.001 gwei floor
      // 2x live base + priority, and never below the (bumped) estimate.
      const estimatedMax = est?.maxFeePerGas
        ? (est.maxFeePerGas * 150n) / 100n + 1_000_000n
        : 0n
      const maxFeePerGas =
        liveBaseFee * 2n + priority > estimatedMax
          ? liveBaseFee * 2n + priority
          : estimatedMax
      const maxPriorityFeePerGas = priority
      console.info('[ppt] fee override', {
        liveBaseFee: liveBaseFee.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      })
      const hash = await writeContractAsync({
        address: PPT_TOKEN_ADDRESS,
        abi: PPT_ERC20_ABI,
        functionName: 'transfer',
        args: [PPT_TREASURY, PPT_FEE_AMOUNT],
        chainId: PPT_CHAIN_ID,
        maxFeePerGas,
        maxPriorityFeePerGas,
      })
      return hash
    }

    const hash = await writeContractAsync({
      address: PPT_TOKEN_ADDRESS,
      abi: PPT_ERC20_ABI,
      functionName: 'transfer',
      args: [PPT_TREASURY, PPT_FEE_AMOUNT],
      chainId: PPT_CHAIN_ID,
    })

    return hash
  }, [address, ensureChain, publicClient, writeContractAsync])

  return {
    address,
    isConnected,
    chainId,
    isOnPptChain: chainId === PPT_CHAIN_ID,
    isConnecting,
    isSwitching,
    isWriting,
    isConfirming,
    isPaying: isWriting || isConfirming || isSwitching,
    error,
    connectWallet,
    ensureChain,
    payOnePpt,
    reset,
    treasury: PPT_TREASURY,
    feeLabel: '1 PPT',
  }
}
