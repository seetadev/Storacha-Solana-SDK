import { StorageDurationSelector } from '@/components/duration-selector'
import { StorageCostSkeleton } from '@/components/skeletons'
import { FileUpload } from '@/components/upload'
import {
  type ConnectionQuality,
  useConnectionCheck,
} from '@/hooks/connection-check'
import { useAuthContext } from '@/hooks/context'
import { useSolPrice } from '@/hooks/sol-price'
import { useStorageCost } from '@/hooks/storage-cost'
import { ConnectionWarning } from '@/layouts/modal-layout/connection-warning'
import { EmailNudge } from '@/layouts/modal-layout/email-nudge'
import { ShortDurationWarning } from '@/layouts/modal-layout/short-duration-warning'
import type { State } from '@/lib/types'
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
import { useDeposit } from '@toju.network/sol'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const SLOW_UPLOAD_THRESHOLD_MS = 15000

export const Upload = () => {
  const { isAuthenticated, balance, refreshBalance, network } = useAuthContext()
  const { publicKey, signTransaction } = useWallet()
  const { price: solPrice } = useSolPrice()
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

  const parsedDuration = Number(storageDuration)
  const isValidDuration =
    storageDuration !== '' &&
    Number.isInteger(parsedDuration) &&
    parsedDuration > 0

  const client = useDeposit(network)

  const apiEndpoint =
    IS_DEV ||
    (network === 'mainnet-beta'
      ? import.meta.env.VITE_API_URL || 'https://api.toju.network'
      : import.meta.env.VITE_API_URL_STAGING ||
        'https://staging-api.toju.network')

  const solanaRpcUrl =
    network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.testnet.solana.com'

  const { latency, checkConnection } = useConnectionCheck({
    apiEndpoint,
    solanaRpcUrl,
  })

  const { totalCost, isLoading: isCostLoading } = useStorageCost(
    selectedFiles,
    isValidDuration ? parsedDuration : 0,
  )

  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance()
    }
  }, [isAuthenticated, selectedFiles.length])

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
      const result = await client.createDeposit({
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

      clearTimeout(slowUploadTimer)

      if (result.success) {
        const uploadDuration = uploadStartTime.current
          ? Math.round((Date.now() - uploadStartTime.current) / 1000)
          : null

        const durationNote =
          uploadDuration && uploadDuration > 30
            ? ` (took ${uploadDuration}s)`
            : ''

        toast.success(
          `Upload successful! ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} stored for ${storageDuration} days${durationNote}`,
          { id: toastId, duration: 5000 },
        )
        await refreshBalance()
        setSelectedFiles([])
        setState('idle')
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

    if (!publicKey || !signTransaction || selectedFiles.length === 0) {
      toast.error('Wallet not properly connected or no files selected')
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

  const usdEquivalent = solPrice ? totalCost * Number(solPrice) : 0
  const hasInsufficientBalance = balance !== null && totalCost > balance
  const isUploadDisabled =
    !isAuthenticated || state === 'uploading' || hasInsufficientBalance

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
                          {formatSOL(totalCost)}
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
    </>
  )
}
