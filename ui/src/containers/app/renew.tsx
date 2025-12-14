import { useAuthContext } from '@/hooks/context'
import { useFileDetails, useRenewalCost } from '@/hooks/use-renewal'
import type { State } from '@/lib/types'
import {
  Box,
  Button,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  ArrowLeftIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  FileIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUpload } from 'storacha-sol'

const DURATION_PRESETS = [7, 30, 90, 180]
const SOL_TO_USD_RATE = 25

export const Renew = () => {
  const { cid } = useSearch({ from: '/renew' })
  const navigate = useNavigate()
  const { user, network, balance } = useAuthContext()
  const { publicKey, signTransaction } = useWallet()
  const client = useUpload(network)

  const [selectedDuration, setSelectedDuration] = useState(30)
  const [customDuration, setCustomDuration] = useState('')
  const [state, setState] = useState<State>('idle')

  const {
    data: fileDetails,
    error: fileError,
    isLoading: isLoadingFile,
  } = useFileDetails(user || '', cid)

  const {
    data: renewalCost,
    error: costError,
    isLoading: isLoadingCost,
  } = useRenewalCost(cid, selectedDuration)

  const handleDurationChange = (days: number) => {
    setSelectedDuration(days)
    setCustomDuration('')
  }

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value)
    const days = parseInt(value)
    if (days > 0) {
      setSelectedDuration(days)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 0
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const renewStorage = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not properly connected')
      return
    }

    if (selectedDuration < 1) {
      toast.error('Duration must be at least 1 day')
      return
    }

    setState('uploading')
    const toastId = toast.loading('Renewing storage...')

    try {
      const result = await client.renewStorageDuration({
        cid,
        duration: selectedDuration,
        payer: publicKey,
        signTransaction: async (tx) => {
          toast.loading('Please sign the transaction in your wallet...', {
            id: toastId,
          })
          const signed = await signTransaction(tx)
          toast.loading('Processing transaction...', { id: toastId })
          return signed
        },
      })

      if (result.success) {
        toast.success(
          `Storage renewed successfully for ${selectedDuration} more days!`,
          { id: toastId, duration: 5000 },
        )
        setTimeout(() => {
          navigate({ to: '/app/history' })
        }, 2000)
      } else {
        throw new Error('Renewal failed')
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to renew storage'
      toast.error(errorMsg, { id: toastId })
      setState('idle')
    }
  }

  const daysRemaining = getDaysRemaining(fileDetails?.expiresAt)
  const isExpired = daysRemaining === 0
  const costInSOL = renewalCost?.costInSOL
    ? parseFloat(String(renewalCost.costInSOL))
    : 0
  const hasInsufficientBalance = balance !== null && costInSOL > balance

  if (isLoadingFile) {
    return (
      <Box textAlign="center" py="4em">
        <Text color="var(--text-muted)" fontSize="var(--font-size-lg)">
          Loading file details...
        </Text>
      </Box>
    )
  }

  /* eslint-disable */
  if (!cid) {
    return (
      <VStack spacing="2em" align="stretch">
        <Box
          textAlign="center"
          py="4em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <WarningCircleIcon size={64} color="var(--error)" weight="duotone" />
          <Text
            mt="1em"
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
          >
            No CID Provided
          </Text>
          <Text mt="0.5em" color="var(--text-muted)">
            Please select a file from your history to renew
          </Text>
          <Link to="/app/history">
            <Button mt="2em" size="md">
              Go to History
            </Button>
          </Link>
        </Box>
      </VStack>
    )
  }

  if (fileError) {
    return (
      <VStack spacing="2em" align="stretch">
        <Box
          textAlign="center"
          py="4em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <WarningCircleIcon size={64} color="var(--error)" weight="duotone" />
          <Text
            mt="1em"
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
          >
            Unable to Load File
          </Text>
          <Text mt="0.5em" color="var(--text-muted)">
            {fileError instanceof Error
              ? fileError.message
              : 'Failed to fetch file details'}
          </Text>
          <Link to="/app/history">
            <Button mt="2em" size="md">
              Go to History
            </Button>
          </Link>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack spacing="2em" align="stretch">
      <Link to="/app/history">
        <HStack
          spacing="0.5em"
          color="var(--text-muted)"
          _hover={{ color: 'var(--primary-500)' }}
          transition="color 0.2s"
          cursor="pointer"
        >
          <ArrowLeftIcon size={16} weight="bold" />
          <Text
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
          >
            Back to History
          </Text>
        </HStack>
      </Link>

      <Box
        p="1.5em"
        bg="var(--bg-dark)"
        border="1px solid var(--border-hover)"
        borderRadius="var(--radius-lg)"
      >
        <HStack spacing=".75em" mb="1.5em">
          <FileIcon size={24} color="var(--primary-500)" weight="duotone" />
          <Text
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
          >
            File Details
          </Text>
        </HStack>

        <VStack spacing="1em" align="stretch">
          <HStack justify="space-between">
            <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
              Filename:
            </Text>
            <Text
              color="var(--text-inverse)"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
            >
              {fileDetails?.fileName || 'Unnamed'}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
              Size:
            </Text>
            <Text
              color="var(--text-inverse)"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
            >
              {formatFileSize(fileDetails?.fileSize)}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
              Current Expiration:
            </Text>
            <Text
              color="var(--text-inverse)"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
            >
              {fileDetails?.expiresAt
                ? new Date(fileDetails.expiresAt).toLocaleDateString()
                : 'N/A'}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
              Status:
            </Text>
            <Text
              color={
                isExpired
                  ? 'var(--error)'
                  : daysRemaining < 7
                    ? 'var(--warning)'
                    : 'var(--success)'
              }
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-semibold)"
            >
              {isExpired
                ? 'Expired'
                : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
            </Text>
          </HStack>
        </VStack>

        {isExpired && (
          <Box
            mt="1em"
            p="1em"
            bg="rgba(239, 68, 68, 0.08)"
            border="1px solid rgba(239, 68, 68, 0.2)"
            borderRadius="var(--radius-md)"
          >
            <Text fontSize="var(--font-size-sm)" color="var(--error)">
              This file has expired. Renew now to restore access.
            </Text>
          </Box>
        )}
      </Box>

      <Box
        p="1.5em"
        bg="var(--bg-dark)"
        border="1px solid var(--border-hover)"
        borderRadius="var(--radius-lg)"
      >
        <HStack spacing=".75em" mb="1.5em">
          <ClockIcon size={24} color="var(--primary-500)" weight="duotone" />
          <Text
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
          >
            Additional Duration
          </Text>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing="1em" mb="1.5em">
          {DURATION_PRESETS.map((days) => (
            <Button
              key={days}
              onClick={() => handleDurationChange(days)}
              size="md"
              h="48px"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              bg={
                selectedDuration === days && !customDuration
                  ? 'var(--bg-dark)'
                  : 'none'
              }
              color={
                selectedDuration === days && !customDuration
                  ? 'white'
                  : 'var(--text-inverse)'
              }
              border="1px solid"
              borderColor={
                selectedDuration === days && !customDuration
                  ? 'var(--primary-500)'
                  : 'var(--border-hover)'
              }
              _hover={{
                bg:
                  selectedDuration === days && !customDuration
                    ? 'var(--primary-600)'
                    : 'var(--lght-grey)',
                borderColor:
                  selectedDuration === days && !customDuration
                    ? 'var(--primary-600)'
                    : 'var(--primary-500)',
              }}
            >
              {days} days
            </Button>
          ))}
        </SimpleGrid>

        <HStack spacing=".75em" align="center">
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
            whiteSpace="nowrap"
          >
            Custom:
          </Text>
          <Input
            type="number"
            min="1"
            value={customDuration}
            onChange={(e) => handleCustomDurationChange(e.target.value)}
            placeholder="Enter days"
            flex="1"
            h="44px"
            bg="none"
            border="1px solid var(--border-hover)"
            borderRadius="var(--radius-md)"
            color="var(--text-inverse)"
            fontSize="var(--font-size-sm)"
            _hover={{
              borderColor: 'var(--primary-500)',
            }}
            _focus={{
              borderColor: 'var(--primary-500)',
              boxShadow: '0 0 0 1px var(--primary-500)',
            }}
            _placeholder={{
              color: 'var(--text-tertiary)',
            }}
          />
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
            whiteSpace="nowrap"
          >
            days
          </Text>
        </HStack>
      </Box>

      <Box
        p="1.5em"
        bg="var(--bg-dark)"
        border="1px solid var(--border-hover)"
        borderRadius="var(--radius-lg)"
      >
        <HStack spacing=".75em" mb="1.5em">
          <CurrencyCircleDollarIcon
            size={24}
            color="var(--primary-500)"
            weight="duotone"
          />
          <Text
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
          >
            Renewal Cost
          </Text>
        </HStack>

        {isLoadingCost ? (
          <Box textAlign="center" py="2em">
            <Text color="var(--text-muted)">Calculating cost...</Text>
          </Box>
        ) : costError ? (
          <Box textAlign="center" py="2em">
            <Text color="var(--error)">Failed to calculate cost</Text>
          </Box>
        ) : renewalCost ? (
          <VStack spacing="1em" align="stretch">
            <HStack justify="space-between">
              <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
                Duration:
              </Text>
              <Text
                color="var(--text-inverse)"
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
              >
                {selectedDuration} days
              </Text>
            </HStack>

            <HStack justify="space-between" align="baseline">
              <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
                Cost:
              </Text>
              <VStack spacing="0" align="flex-end">
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
                  {renewalCost.costInSOL} SOL
                </Text>
                <Text fontSize="var(--font-size-xs)" color="var(--text-muted)">
                  ≈ ${(costInSOL * SOL_TO_USD_RATE).toFixed(2)} USD
                </Text>
              </VStack>
            </HStack>

            <Box w="100%" h="1px" bg="var(--border-dark)" />

            <HStack justify="space-between">
              <Text color="var(--text-muted)" fontSize="var(--font-size-sm)">
                New Expiration:
              </Text>
              <Text
                color="var(--success)"
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
              >
                {new Date(renewalCost.newExpirationDate).toLocaleDateString()}
              </Text>
            </HStack>
          </VStack>
        ) : (
          <Box textAlign="center" py="2em">
            <Text color="var(--text-muted)">Select a duration to see cost</Text>
          </Box>
        )}
      </Box>

      {hasInsufficientBalance && (
        <HStack
          p="1em"
          bg="rgba(239, 68, 68, 0.08)"
          border="1px solid rgba(239, 68, 68, 0.2)"
          borderRadius="var(--radius-md)"
          spacing=".75em"
        >
          <WarningCircleIcon size={20} color="var(--error)" weight="fill" />
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
              You need {(costInSOL - (balance || 0)).toFixed(6)} SOL more to
              complete this renewal.
            </Text>
          </VStack>
        </HStack>
      )}

      <Button
        onClick={renewStorage}
        isLoading={state === 'uploading'}
        disabled={
          state === 'uploading' || !renewalCost || hasInsufficientBalance
        }
        size="lg"
        height="48px"
        fontSize="var(--font-size-base)"
        fontWeight="var(--font-weight-semibold)"
        bg="var(--text-inverse)"
        color="black"
        borderRadius="var(--radius-lg)"
        transition="all 0.2s ease"
        _hover={{
          bg:
            state === 'uploading' || !renewalCost || hasInsufficientBalance
              ? undefined
              : 'var(--primary-600)',
          transform:
            state === 'uploading' || !renewalCost || hasInsufficientBalance
              ? 'none'
              : 'translateY(-1px)',
          boxShadow:
            state === 'uploading' || !renewalCost || hasInsufficientBalance
              ? undefined
              : '0 4px 12px rgba(249, 115, 22, 0.4), 0 0 20px rgba(249, 115, 22, 0.2)',
        }}
        _active={{
          transform:
            state === 'uploading' || !renewalCost || hasInsufficientBalance
              ? 'none'
              : 'translateY(0)',
          bg:
            state === 'uploading' || !renewalCost || hasInsufficientBalance
              ? undefined
              : 'var(--primary-700)',
        }}
        _disabled={{
          bg: 'var(--bg-dark)',
          color: 'var(--text-tertiary)',
          cursor: 'not-allowed',
          border: '1px solid var(--border-hover)',
          opacity: 0.6,
        }}
      >
        {state === 'uploading'
          ? 'Processing...'
          : hasInsufficientBalance
            ? 'Insufficient Balance'
            : `Renew for ${selectedDuration} days`}
      </Button>
    </VStack>
  )
}
