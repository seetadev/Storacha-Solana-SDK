import { StorageDurationSelector } from '@/components/duration-selector'
import { StorageCostSkeleton } from '@/components/skeletons'
import { FileUpload } from '@/components/upload'
import {
  useConnectionCheck,
  /* eslint-disable */
  type ConnectionQuality,
} from '@/hooks/connection-check'
import { useAuthContext, useChainContext } from '@/hooks/context'
import { useSolPrice } from '@/hooks/sol-price'
import { useStorageCost, useUsdfcStorageCost } from '@/hooks/storage-cost'
import { UploadSuccess } from '@/layouts/modal-layout'
import { ConnectionWarning } from '@/layouts/modal-layout/connection-warning'
import { EmailNudge } from '@/layouts/modal-layout/email-nudge'
import { ShortDurationWarning } from '@/layouts/modal-layout/short-duration-warning'
import type { State, UploadResultInfo } from '@/lib/types'
import { formatFileSize, formatSOL, formatUSD, IS_DEV } from '@/lib/utils'
import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import {
  CurrencyCircleDollarIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Transaction } from '@solana/web3.js'
import {
  Environment,
  USDFC_CONTRACT_ADDRESS,
  useUpload as useFilUpload,
} from '@toju.network/fil'
import { useDeposit } from '@toju.network/sol'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useConnection, useReadContract, useWriteContract } from 'wagmi'

const SLOW_UPLOAD_THRESHOLD_MS = 15000

export const Upload = () => {
  const { isAuthenticated, balance, refreshBalance, network } = useAuthContext()
  const { selectedChain } = useChainContext()
  const { publicKey, signTransaction } = useWallet()
  const { price: solPrice } = useSolPrice()

  const { address: filAddress } = useConnection()
  const isFilMainnet = import.meta.env.VITE_FILECOIN_NETWORK === 'mainnet'
  const usdfcContractAddress = isFilMainnet
    ? USDFC_CONTRACT_ADDRESS.mainnet
    : USDFC_CONTRACT_ADDRESS.calibration
  const { data: usdfcBalanceRaw } = useReadContract({
    address: usdfcContractAddress as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'balanceOf',
    args: filAddress ? [filAddress] : undefined,
    query: { enabled: !!filAddress },
  })
  const usdfcBalance = usdfcBalanceRaw ? Number(usdfcBalanceRaw) / 1e18 : null
  const filEnvironment = isFilMainnet
    ? Environment.mainnet
    : Environment.calibration
  const filClient = useFilUpload(
    filEnvironment,
    IS_DEV ? import.meta.env.VITE_API_URL : undefined,
  )
  const { writeContractAsync } = useWriteContract()

  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([])
  const [storageDuration, setStorageDuration] = useState<string>('30')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | ConnectionQuality
  >('unknown')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTime = useRef<number | null>(null)

  const { isOpen, onOpen: openEmailNudge, onClose } = useDisclosure()
  const {
    isOpen: isShortDurationWarningOpen,
    onOpen: openShortDurationWarning,
    onClose: closeShortDurationWarning,
  } = useDisclosure()
  const {
    isOpen: isConnectionWarningOpen,
    onOpen: openConnectionWarning,
    onClose: closeConnectionWarning,
  } = useDisclosure()
  const {
    isOpen: isSuccessModalOpen,
    onOpen: openSuccessModal,
    onClose: closeSuccessModal,
  } = useDisclosure()

  const [uploadResult, setUploadResult] = useState<UploadResultInfo | null>(
    null,
  )

  const parsedDuration = Number(storageDuration)
  const isValidDuration =
    storageDuration !== '' &&
    Number.isInteger(parsedDuration) &&
    parsedDuration > 0

  const configuredNetwork =
    import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta'

  const apiEndpoint =
    import.meta.env.VITE_API_URL ||
    (configuredNetwork === 'mainnet-beta'
      ? 'https://api.toju.network'
      : 'https://staging-api.toju.network')

  const shouldUseProxy = !IS_DEV && configuredNetwork === 'mainnet-beta'
  const rpcUrl = shouldUseProxy
    ? import.meta.env.VITE_HELIUS_PROXY_URL
    : undefined

  const client = useDeposit(
    configuredNetwork,
    IS_DEV ? apiEndpoint : undefined,
    rpcUrl,
  )

  const solanaRpcUrl = shouldUseProxy
    ? rpcUrl!
    : configuredNetwork === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.testnet.solana.com'

  const { latency, checkConnection } = useConnectionCheck({
    apiEndpoint,
    solanaRpcUrl,
  })

  const { totalCost: solCost, isLoading: isSolCostLoading } = useStorageCost(
    selectedChain === 'sol' ? selectedFiles : [],
    isValidDuration ? parsedDuration : 0,
  )
  const { totalCost: usdfcCost, isLoading: isUsdfcCostLoading } =
    useUsdfcStorageCost(
      selectedChain === 'fil' ? selectedFiles : [],
      isValidDuration ? parsedDuration : 0,
    )

  const totalCost = selectedChain === 'sol' ? solCost : usdfcCost
  const isCostLoading =
    selectedChain === 'sol' ? isSolCostLoading : isUsdfcCostLoading

  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance()
    }
  }, [isAuthenticated, refreshBalance])

  const handleFilesSelected = (files: Array<File>) => {
    setSelectedFiles(files)
  }

  const performUpload = async () => {
    closeConnectionWarning()
    setState('uploading')
    uploadStartTime.current = Date.now()

    const toastId = toast.loading('Uploading files to IPFS...')

    const slowUploadTimer = setTimeout(() => {
      toast.loading(
        "Upload is taking longer than expected. Please don't close this tab - your files are still being uploaded.",
        { id: toastId, duration: Infinity },
      )
    }, SLOW_UPLOAD_THRESHOLD_MS)

    try {
      let result: {
        success: boolean
        cid: string
        transactionHash?: string
        signature?: string
        error?: string
      }

      if (selectedChain === 'fil') {
        if (!filAddress) throw new Error('FIL wallet not connected')
        result = await filClient.createDeposit({
          file: selectedFiles,
          durationDays: parsedDuration,
          userAddress: filAddress,
          userEmail: email || undefined,
          sendTransaction: async (txData) => {
            const chainId = isFilMainnet ? 314 : 314159 // Filecoin mainnet or calibration
            toast.loading(
              'Please confirm the USDFC transfer in your wallet...',
              {
                id: toastId,
              },
            )
            const hash = await writeContractAsync({
              chainId,
              address: txData.contractAddress as `0x${string}`,
              abi: [
                {
                  name: 'transfer',
                  type: 'function',
                  stateMutability: 'nonpayable',
                  inputs: [
                    { name: 'to', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                  ],
                  outputs: [{ type: 'bool' }],
                },
              ] as const,
              functionName: 'transfer',
              args: [txData.to as `0x${string}`, BigInt(txData.amount)],
            })
            toast.loading('Processing transaction...', { id: toastId })
            return hash
          },
        })
      } else {
        const solResult = await client.createDeposit({
          file: selectedFiles,
          durationDays: parsedDuration,
          payer: publicKey!,
          signTransaction: async (tx: Transaction) => {
            toast.loading('Please sign the transaction in your wallet...', {
              id: toastId,
            })
            const signed = await signTransaction!(tx)
            toast.loading('Processing transaction...', { id: toastId })
            return signed
          },
          userEmail: email || undefined,
        })
        result = { ...solResult, transactionHash: solResult.signature }
      }

      clearTimeout(slowUploadTimer)

      if (result.success) {
        toast.success('Upload successful!', { id: toastId, duration: 3000 })

        const totalFileSize = selectedFiles.reduce(
          (acc, file) => acc + file.size,
          0,
        )
        const usdCost =
          selectedChain === 'sol' && solPrice
            ? totalCost * Number(solPrice)
            : totalCost

        setUploadResult({
          cid: result.cid,
          fileName:
            selectedFiles.length === 1 ? selectedFiles[0].name : undefined,
          fileSize: totalFileSize,
          fileCount: selectedFiles.length,
          duration: parsedDuration,
          costInSOL: selectedChain === 'sol' ? totalCost : 0,
          costInUSD: usdCost,
          costInUSDFC: selectedChain === 'fil' ? totalCost : 0,
          paymentChain: selectedChain,
          transactionHash: result.transactionHash ?? result.signature ?? '',
        })

        if (selectedChain === 'sol') await refreshBalance()
        setSelectedFiles([])
        setState('idle')
        openSuccessModal()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      clearTimeout(slowUploadTimer)
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed'
      const isNetworkError =
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('fetch')
      const displayMessage = isNetworkError
        ? `${errorMessage}. This may be due to a slow internet connection. Please try again with a stronger connection.`
        : errorMessage
      toast.error(displayMessage, { id: toastId })
      setState('idle')
    } finally {
      uploadStartTime.current = null
    }
  }

  const handleUpload = async () => {
    if (!isValidDuration) {
      toast.error('Please enter a valid number of storage days')
      return
    }

    if (
      selectedChain === 'sol' &&
      (!publicKey || !signTransaction || selectedFiles.length === 0)
    ) {
      toast.error('Wallet not properly connected or no files selected')
      return
    }

    if (
      selectedChain === 'fil' &&
      (!filAddress || selectedFiles.length === 0)
    ) {
      toast.error('FIL wallet not connected or no files selected')
      return
    }

    // show warning if duration is less than 7 days first
    if (parsedDuration < 7) {
      openShortDurationWarning()
      return
    }

    if (!email.trim()) {
      openEmailNudge()
      return
    }

    // we should always show connection warning modal and check connection
    // because of the risk associated with actually uploading (false-postively) stuff and it not being
    // retrievable via any of the IPFS gateways.
    setConnectionStatus('checking')
    openConnectionWarning()

    const quality = await checkConnection()
    setConnectionStatus(quality)
  }

  const proceedFromConnectionWarning = () => {
    closeConnectionWarning()
    performUpload()
  }

  const proceed = () => {
    onClose()

    setConnectionStatus('checking')
    openConnectionWarning()
    checkConnection().then((quality) => {
      setConnectionStatus(quality)
    })
  }

  const proceedWithShortDuration = () => {
    closeShortDurationWarning()
    // ff no email, show email nudge, otherwise show connection warning
    if (!email.trim()) {
      openEmailNudge()
    } else {
      setConnectionStatus('checking')
      openConnectionWarning()
      checkConnection().then((quality) => {
        setConnectionStatus(quality)
      })
    }
  }

  const enterEmail = () => {
    onClose()
    setTimeout(() => {
      emailInputRef.current?.focus({ preventScroll: false })
      emailInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 300)
  }

  const usdEquivalent =
    selectedChain === 'sol' && solPrice
      ? totalCost * Number(solPrice)
      : totalCost
  const usdfcBalanceNum = usdfcBalance
  const hasInsufficientBalance =
    selectedChain === 'sol'
      ? balance !== null && totalCost > balance
      : usdfcBalanceNum !== null && totalCost > usdfcBalanceNum
  const isUploadDisabled =
    selectedChain === 'sol'
      ? !isAuthenticated || state === 'uploading' || hasInsufficientBalance
      : !filAddress || state === 'uploading' || hasInsufficientBalance

  const networkDisplay = network

  const totalFilesSize = selectedFiles.reduce((acc, curr) => acc + curr.size, 0)

  return (
    <>
      <VStack spacing="2em" align="stretch">
        <FileUpload
          onFilesSelected={handleFilesSelected}
          allowDirectories={true}
        />

        {selectedFiles.length > 0 && (
          <VStack spacing="1.5em" align="stretch">
            <StorageDurationSelector
              selectedDuration={storageDuration}
              onDurationChange={setStorageDuration}
              email={email}
              onEmailChange={setEmail}
              emailInputRef={emailInputRef}
            />

            <Box
              p="1.5em"
              bg="var(--bg-dark)"
              border="1px solid var(--border-hover)"
              borderRadius="var(--radius-lg)"
              transition="all 0.2s ease"
            >
              <HStack spacing=".75em" mb="1em">
                <CurrencyCircleDollarIcon
                  size={24}
                  color="var(--primary-500)"
                  weight="duotone"
                />
                <Text
                  fontSize="var(--font-size-base)"
                  fontWeight="var(--font-weight-semibold)"
                  color="var(--text-inverse)"
                >
                  Payment Summary
                </Text>
              </HStack>

              <Stack spacing=".75em">
                <HStack justify="space-between" align="center">
                  <Text
                    fontSize="var(--font-size-sm)"
                    color="var(--text-muted)"
                    fontWeight="var(--font-weight-medium)"
                  >
                    Current Balance:
                  </Text>
                  <VStack spacing="0" align="flex-end">
                    {selectedChain === 'sol' ? (
                      <>
                        <Text
                          fontSize="var(--font-size-lg)"
                          fontWeight="var(--font-weight-semibold)"
                          color="var(--text-inverse)"
                          lineHeight="var(--line-height-tight)"
                        >
                          {balance !== null ? balance.toFixed(4) : '-.----'} SOL
                        </Text>
                        <Text
                          fontSize="var(--font-size-xs)"
                          color="var(--text-tertiary)"
                          lineHeight="var(--line-height-tight)"
                        >
                          ≈ $
                          {balance !== null && solPrice
                            ? (balance * Number(solPrice)).toFixed(2)
                            : '--'}{' '}
                          USD
                        </Text>
                      </>
                    ) : (
                      <Text
                        fontSize="var(--font-size-lg)"
                        fontWeight="var(--font-weight-semibold)"
                        color="var(--text-inverse)"
                        lineHeight="var(--line-height-tight)"
                      >
                        {usdfcBalanceNum !== null
                          ? usdfcBalanceNum.toFixed(2)
                          : '-.--'}{' '}
                        USDFC
                      </Text>
                    )}
                  </VStack>
                </HStack>

                <Box w="100%" h="1px" bg="var(--border-dark)" />

                <HStack justify="space-between" align="baseline">
                  <Text
                    fontSize="var(--font-size-sm)"
                    color="var(--text-muted)"
                    fontWeight="var(--font-weight-medium)"
                  >
                    Storage Cost:
                  </Text>
                  <VStack spacing="0" align="flex-end">
                    {isCostLoading ? (
                      <StorageCostSkeleton />
                    ) : (
                      <>
                        <Text
                          fontSize="var(--font-size-2xl)"
                          fontWeight="var(--font-weight-bold)"
                          color={
                            hasInsufficientBalance
                              ? 'var(--error)'
                              : 'var(--text-inverse)'
                          }
                          lineHeight="var(--line-height-tight)"
                        >
                          {selectedChain === 'sol'
                            ? formatSOL(totalCost)
                            : `${totalCost.toFixed(6)} USDFC`}
                        </Text>
                        <Text
                          fontSize="var(--font-size-sm)"
                          color="var(--text-muted)"
                          lineHeight="var(--line-height-tight)"
                        >
                          ≈ {formatUSD(usdEquivalent)}
                        </Text>
                      </>
                    )}
                  </VStack>
                </HStack>

                <Box w="100%" h="1px" bg="var(--border-dark)" />

                <HStack justify="space-between" fontSize="var(--font-size-xs)">
                  <Text color="var(--text-tertiary)">
                    {selectedFiles.length} file
                    {selectedFiles.length > 1 ? 's' : ''} •{' '}
                    {formatFileSize(totalFilesSize)} • {storageDuration} days
                  </Text>
                  <Text color="var(--text-tertiary)">
                    Network:{' '}
                    <Text as="span" textTransform="capitalize">
                      {networkDisplay}
                    </Text>
                  </Text>
                </HStack>
              </Stack>
            </Box>

            {hasInsufficientBalance && (
              <HStack
                p="1em"
                bg="rgba(239, 68, 68, 0.08)"
                border="1px solid rgba(239, 68, 68, 0.2)"
                borderRadius="var(--radius-md)"
                spacing=".75em"
              >
                <WarningCircleIcon
                  size={20}
                  color="var(--error)"
                  weight="fill"
                />
                <VStack spacing="0.25em" align="start" flex="1">
                  <Text
                    fontSize="var(--font-size-sm)"
                    fontWeight="var(--font-weight-medium)"
                    color="var(--error)"
                    lineHeight="var(--line-height-tight)"
                  >
                    Insufficient Balance
                  </Text>
                  <Text
                    fontSize="var(--font-size-xs)"
                    color="var(--error)"
                    lineHeight="var(--line-height-relaxed)"
                    opacity="0.9"
                  >
                    You need {(totalCost - (balance || 0)).toFixed(6)} SOL more
                    to complete this upload. Please add funds to your wallet.
                  </Text>
                </VStack>
              </HStack>
            )}

            <Button
              onClick={handleUpload}
              isLoading={state === 'uploading'}
              loadingText="Uploading..."
              disabled={isUploadDisabled}
              size="lg"
              height="48px"
              fontSize="var(--font-size-base)"
              fontWeight="var(--font-weight-semibold)"
              bg="var(--text-inverse)"
              color="var(--eerie-black)"
              borderRadius="var(--radius-lg)"
              transition="all 0.2s ease"
              _hover={{
                bg: isUploadDisabled ? undefined : 'var(--text-inverse)',
                transform: isUploadDisabled ? 'none' : 'translateY(-1px)',
                boxShadow: isUploadDisabled
                  ? undefined
                  : '0 4px 12px rgba(24, 24, 23, 0.4), 0 0 20px rgba(249, 115, 22, 0.2)',
              }}
              _active={{
                transform: isUploadDisabled ? 'none' : 'translateY(0)',
                bg: isUploadDisabled ? undefined : 'var(--text-inverse)',
              }}
              _disabled={{
                bg: 'var(--bg-dark)',
                border: '1px solid var(--border-hover)',
                color: 'var(--text-tertiary)',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              {state === 'uploading'
                ? 'Uploading...'
                : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : 'Upload & Deposit'}
            </Button>
          </VStack>
        )}
      </VStack>

      <EmailNudge isOpen={isOpen} onClose={enterEmail} onProceed={proceed} />
      <ShortDurationWarning
        isOpen={isShortDurationWarningOpen}
        onClose={closeShortDurationWarning}
        onProceed={proceedWithShortDuration}
        duration={parsedDuration}
      />
      <ConnectionWarning
        isOpen={isConnectionWarningOpen}
        onClose={closeConnectionWarning}
        onProceed={proceedFromConnectionWarning}
        connectionStatus={connectionStatus}
        latency={latency}
      />

      {uploadResult && (
        <UploadSuccess
          isOpen={isSuccessModalOpen}
          onClose={closeSuccessModal}
          uploadInfo={uploadResult}
        />
      )}
    </>
  )
}
