import { useAuthContext } from '@/hooks/context'
import { useFileDetails, useRenewalCost } from '@/hooks/renewal'
import { useSolPrice } from '@/hooks/sol-price'
import type { State } from '@/lib/types'
import { IS_DEV } from '@/lib/utils'
import {
  Box,
  Button,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { formatSOL, formatUSD } from '@/lib/utils'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  FileIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useUpload } from '@toju.network/sol'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'

const DURATION_PRESETS = [7, 30, 90, 180]

export const Renew = () => {
  const search = useSearch({ from: '/renew' })
  const navigate = useNavigate()
  const { user, network, balance } = useAuthContext()
  const { publicKey, signTransaction } = useWallet();
  const { price: solPrice } = useSolPrice()
  const client = useUpload(network, IS_DEV)

  const cids = useMemo(() => {
    if (typeof search.cids === 'string') {
      return search.cids.split(',').filter(Boolean)
    }
    return []
  }, [search])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  useEffect(() => {
    if (!emblaApi) return

    const update = () => {
      setActiveIndex(emblaApi.selectedScrollSnap())
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }

    emblaApi.on('select', update)
    emblaApi.on('reInit', update)
    update()

    return () => {
      emblaApi.off('select', update)
      emblaApi.off('reInit', update)
    }
  }, [emblaApi])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const activeCid = cids[activeIndex]

  const [selectedDuration, setSelectedDuration] = useState(30)
  const [customDuration, setCustomDuration] = useState('')
  const [state, setState] = useState<State>('idle')

  const { data: fileDetails, error: fileError } =
    useFileDetails(user || '', activeCid)

  const {
    data: renewalCost,
    error: costError,
    isLoading: isLoadingCost,
  } = useRenewalCost(activeCid, selectedDuration)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value)
    const parsed = parseInt(value, 10)
    if (parsed > 0) {
      setSelectedDuration(parsed)
    }
  }


  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 0
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const daysRemaining = getDaysRemaining(fileDetails?.expiresAt)
  const isExpired = daysRemaining === 0
  const costInSOL = Number(renewalCost?.costInSOL || 0)
  const hasInsufficientBalance =
    balance !== null && costInSOL > balance

  const renewStorage = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not properly connected')
      return
    }

    setState('uploading')
    const toastId = toast.loading('Renewing storage...')

    try {
      const result = await client.renewStorageDuration({
        cid: activeCid,
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
      toast.error(err.message || 'Failed to renew storage', { id: toastId })
      setState('idle')
    }
  }

  if (cids.length === 0) {
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
    <VStack spacing="2em" align="stretch" w="90%" maxW="640px">
      <Link to="/app/history">
        <HStack
          spacing="0.5em"
          color="var(--text-muted)"
          _hover={{ color: 'var(--primary-500)' }}
        >
          <ArrowLeftIcon size={16} weight="bold" />
          <Text fontSize="var(--font-size-sm)" fontWeight="var(--font-weight-medium)">
            Back to History
          </Text>
        </HStack>
      </Link>

      {cids.length > 1 && (
        <HStack justify="space-between">
          <Button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            size="sm"
            bg="var(--text-inverse)"
            color="black"
            _disabled={{ opacity: 0.4 }}
          >
            <ArrowLeftIcon />
          </Button>

          <Text fontSize="sm" color="var(--text-muted)">
            {activeIndex + 1} of {cids.length}
          </Text>

          <Button
            onClick={scrollNext}
            disabled={!canScrollNext}
            size="sm"
            bg="var(--text-inverse)"
            color="black"
            _disabled={{ opacity: 0.4 }}
          >
            <ArrowRightIcon />
          </Button>
        </HStack>
      )}

      <Box overflow="hidden" ref={emblaRef}>
        <HStack spacing="1.5em">
          {cids.map((cid) => (
            <Box
              key={cid}
              flex="0 0 100%"
              minW="100%"
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
                  <Text color="var(--text-muted)">Filename:</Text>
                  <Text color="var(--text-inverse)">
                    {fileDetails?.fileName || 'Unnamed'}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text color="var(--text-muted)">Size:</Text>
                  <Text color="var(--text-inverse)">
                    {formatFileSize(fileDetails?.fileSize)}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text color="var(--text-muted)">Current Expiration:</Text>
                  <Text color="var(--text-inverse)">
                    {fileDetails?.expiresAt
                      ? dayjs(fileDetails.expiresAt).format('DD/MM/YYYY')
                      : 'N/A'}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text color="var(--text-muted)">Status:</Text>
                  <Text
                    color={
                      isExpired
                        ? 'var(--error)'
                        : daysRemaining < 7
                          ? 'var(--warning)'
                          : 'var(--success)'
                    }
                    fontWeight="var(--font-weight-semibold)"
                  >
                    {isExpired
                      ? 'Expired'
                      : `${daysRemaining} days remaining`}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          ))}
        </HStack>
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
              onClick={() => {
                setSelectedDuration(days)
                setCustomDuration('')
              }}
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
          <Text color="var(--error)">Failed to calculate cost</Text>
        ) : (
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
                  {formatSOL(renewalCost?.costInSOL)} SOL
                </Text>
                <Text fontSize="var(--font-size-xs)" color="var(--text-muted)">
                  {solPrice
                    ? `≈ $${formatUSD(costInSOL * Number(solPrice))} USD`
                    : '≈ $0.00 USD'}
                </Text>
              </VStack>
            </HStack>

            <HStack justify="space-between">
              <Text color="var(--text-muted)">New Expiration:</Text>
              <Text color="var(--success)">
                {renewalCost?.newExpirationDate
                  ? dayjs(renewalCost.newExpirationDate).format('DD/MM/YYYY')
                  : '—'}
              </Text>
            </HStack>
          </VStack>
        )}
      </Box>

      <Button
        onClick={renewStorage}
        isLoading={state === 'uploading'}
        disabled={state === 'uploading' || !renewalCost || hasInsufficientBalance}
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
