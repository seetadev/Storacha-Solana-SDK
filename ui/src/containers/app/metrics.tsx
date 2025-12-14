import { useAuthContext } from '@/hooks/context'
import { useUploadHistory } from '@/hooks/upload-history'
import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import {
  ChartLineIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  FileIcon,
  HardDrivesIcon,
  WalletIcon,
} from '@phosphor-icons/react'

// we need to find a way around getting this as live data
const SOL_TO_USD_RATE = 25

export const Metrics = () => {
  const { balance } = useAuthContext()
  const { stats, files, isLoading } = useUploadHistory()

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  const expiredFiles = files.filter((f) => f.status === 'expired').length
  const averageCost =
    stats.totalFiles > 0 ? stats.totalSpent / stats.totalFiles : 0

  if (isLoading) {
    return (
      <Box textAlign="center" py="4em">
        <Text color="var(--text-muted)" fontSize="var(--font-size-lg)">
          Loading metrics...
        </Text>
      </Box>
    )
  }

  const metricCards = [
    {
      icon: FileIcon,
      label: 'Total Files',
      value: stats.totalFiles.toString(),
      color: 'var(--primary-500)',
      bgColor: 'rgba(249, 115, 22, 0.1)',
    },
    {
      icon: HardDrivesIcon,
      label: 'Total Storage',
      value: formatFileSize(stats.totalStorage),
      color: 'var(--success)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    {
      icon: CurrencyCircleDollarIcon,
      label: 'Total Spent',
      value: `${stats.totalSpent.toFixed(4)} SOL`,
      subValue: `≈ $${(stats.totalSpent * SOL_TO_USD_RATE).toFixed(2)}`,
      color: 'var(--info)',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      icon: ClockIcon,
      label: 'Active Files',
      value: stats.activeFiles.toString(),
      subValue: `${expiredFiles} expired`,
      color: 'var(--warning)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    {
      icon: ChartLineIcon,
      label: 'Average Cost',
      value: `${averageCost.toFixed(6)} SOL`,
      subValue: 'per file',
      color: 'var(--primary-500)',
      bgColor: 'rgba(249, 115, 22, 0.1)',
    },
    {
      icon: WalletIcon,
      label: 'Current Balance',
      value: balance !== null ? `${balance.toFixed(4)} SOL` : '-.----',
      subValue:
        balance !== null ? `≈ $${(balance * SOL_TO_USD_RATE).toFixed(2)}` : '',
      color: 'var(--success)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
  ]

  return (
    <VStack spacing="2em" align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="1.5em">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Box
              key={index}
              p="1.5em"
              bg="var(--bg-dark)"
              border="1px solid var(--border-hover)"
              borderRadius="var(--radius-lg)"
              transition="all 0.2s ease"
              _hover={{
                borderColor: 'var(--border-hover)',
                transform: 'translateY(-2px)',
              }}
            >
              <Box
                display="inline-flex"
                p="0.75em"
                bg={metric.bgColor}
                borderRadius="var(--radius-lg)"
                mb="1em"
              >
                <Icon size={24} color={metric.color} weight="duotone" />
              </Box>

              <Text
                fontSize="var(--font-size-xs)"
                color="var(--text-muted)"
                fontWeight="var(--font-weight-medium)"
                mb="0.5em"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                {metric.label}
              </Text>

              <Text
                fontSize="var(--font-size-2xl)"
                fontWeight="var(--font-weight-bold)"
                color="var(--text-inverse)"
                lineHeight="var(--line-height-tight)"
              >
                {metric.value}
              </Text>

              {metric.subValue && (
                <Text
                  fontSize="var(--font-size-sm)"
                  color="var(--text-tertiary)"
                  mt="0.25em"
                >
                  {metric.subValue}
                </Text>
              )}
            </Box>
          )
        })}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="1.5em">
        <Box
          p="1.5em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <Text
            fontSize="var(--font-size-base)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
            mb="1em"
          >
            Storage Overview
          </Text>

          <VStack spacing="0.75em" align="stretch">
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Total Files:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--text-inverse)"
              >
                {stats.totalFiles}
              </Text>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Active Files:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--success)"
              >
                {stats.activeFiles}
              </Text>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Expired Files:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--error)"
              >
                {expiredFiles}
              </Text>
            </Box>

            <Box w="100%" h="1px" bg="var(--border-dark)" my="0.25em" />

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Total Storage:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--text-inverse)"
              >
                {formatFileSize(stats.totalStorage)}
              </Text>
            </Box>
          </VStack>
        </Box>

        <Box
          p="1.5em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <Text
            fontSize="var(--font-size-base)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-inverse)"
            mb="1em"
          >
            Spending Summary
          </Text>

          <VStack spacing="0.75em" align="stretch">
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Total Spent:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--text-inverse)"
              >
                {stats.totalSpent.toFixed(4)} SOL
              </Text>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                USD Value:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--text-inverse)"
              >
                ${(stats.totalSpent * SOL_TO_USD_RATE).toFixed(2)}
              </Text>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Average per File:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--text-inverse)"
              >
                {averageCost.toFixed(6)} SOL
              </Text>
            </Box>

            <Box w="100%" h="1px" bg="var(--border-dark)" my="0.25em" />

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Current Balance:
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-semibold)"
                color="var(--success)"
              >
                {balance !== null ? `${balance.toFixed(4)} SOL` : '-.----'}
              </Text>
            </Box>
          </VStack>
        </Box>
      </SimpleGrid>
    </VStack>
  )
}
