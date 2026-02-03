import { useUploadHistory } from '@/hooks/upload-history'
import type { UploadedFile } from '@/lib/types'
import { Box, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react'
import { ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export const Transactions = () => {
  const { files, isLoading, stats } = useUploadHistory()

  // Network is determined at build time via env var
  const configuredNetwork =
    import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta'

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Transaction hash copied to clipboard')
  }

  const openExplorer = (signature: string) => {
    const cluster =
      configuredNetwork === 'mainnet-beta'
        ? ''
        : `?cluster=${configuredNetwork}`
    window.open(
      `https://explorer.solana.com/tx/${signature}${cluster}`,
      '_blank',
    )
  }

  if (isLoading) {
    return (
      <Box textAlign="center" py="4em">
        <Text color="var(--text-muted)" fontSize="var(--font-size-lg)">
          Loading transactions...
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing="2em" align="stretch">
      <HStack spacing="1.5em">
        <Box
          flex="1"
          p="1.5em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <Text
            fontSize="var(--font-size-xs)"
            color="var(--text-muted)"
            mb="0.5em"
          >
            Total Transactions
          </Text>
          <Text
            fontSize="var(--font-size-3xl)"
            fontWeight="var(--font-weight-bold)"
            color="var(--text-inverse)"
          >
            {stats.totalFiles}
          </Text>
        </Box>

        <Box
          flex="1"
          p="1.5em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <Text
            fontSize="var(--font-size-xs)"
            color="var(--text-muted)"
            mb="0.5em"
          >
            Total Spent
          </Text>
          <Text
            fontSize="var(--font-size-3xl)"
            fontWeight="var(--font-weight-bold)"
            color="var(--text-inverse)"
          >
            {stats.totalSpent.toFixed(4)}
            <Text
              as="span"
              fontSize="var(--font-size-lg)"
              color="var(--text-muted)"
              ml="0.25em"
            >
              SOL
            </Text>
          </Text>
        </Box>
      </HStack>

      {files.length === 0 ? (
        <Box
          textAlign="center"
          py="4em"
          px="2em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-medium)"
          >
            No transactions yet
          </Text>
        </Box>
      ) : (
        <Stack spacing="1em">
          {files.map((file: UploadedFile) => (
            <Box
              key={file.id}
              p="1.5em"
              bg="var(--bg-dark)"
              border="1px solid var(--border-hover)"
              borderRadius="var(--radius-lg)"
              transition="all 0.2s ease"
              _hover={{
                borderColor: 'var(--border-hover)',
              }}
            >
              <HStack justify="space-between" align="start">
                <VStack spacing="0.75em" align="start" flex="1">
                  <HStack spacing="0.75em">
                    <Text
                      fontSize="var(--font-size-base)"
                      fontWeight="var(--font-weight-semibold)"
                      color="var(--text-inverse)"
                    >
                      {file.filename}
                    </Text>
                  </HStack>

                  <HStack spacing="1.5em" fontSize="var(--font-size-sm)">
                    <HStack spacing="0.5em">
                      <Text color="var(--text-tertiary)">Date:</Text>
                      <Text color="var(--text-muted)">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </Text>
                    </HStack>

                    <HStack spacing="0.5em">
                      <Text color="var(--text-tertiary)">Duration:</Text>
                      <Text color="var(--text-muted)">
                        {file.duration} days
                      </Text>
                    </HStack>
                  </HStack>

                  <HStack spacing="0.75em" fontSize="var(--font-size-xs)">
                    <Text
                      color="var(--text-tertiary)"
                      fontFamily="var(--font-family-mono)"
                    >
                      TX:
                    </Text>
                    <Text
                      color="var(--text-muted)"
                      fontFamily="var(--font-family-mono)"
                    >
                      {file.signature.substring(0, 16)}...
                      {file.signature.substring(file.signature.length - 8)}
                    </Text>
                    <IconButton
                      aria-label="Copy transaction"
                      icon={<CopyIcon size={14} />}
                      size="xs"
                      variant="ghost"
                      color="var(--text-muted)"
                      _hover={{
                        bg: 'var(--lght-grey)',
                        color: 'var(--primary-500)',
                      }}
                      onClick={() => copyToClipboard(file.signature)}
                    />
                    <IconButton
                      aria-label="View in explorer"
                      icon={<ArrowSquareOutIcon size={14} />}
                      size="xs"
                      variant="ghost"
                      color="var(--text-muted)"
                      _hover={{
                        bg: 'var(--lght-grey)',
                        color: 'var(--primary-500)',
                      }}
                      onClick={() => openExplorer(file.signature)}
                    />
                  </HStack>
                </VStack>

                <VStack spacing="0.25em" align="flex-end">
                  <Text
                    fontSize="var(--font-size-xl)"
                    fontWeight="var(--font-weight-bold)"
                    color="var(--text-inverse)"
                  >
                    -{file.cost.toFixed(6)} SOL
                  </Text>
                  <Text
                    fontSize="var(--font-size-xs)"
                    color="var(--text-muted)"
                  >
                    Storage Deposit
                  </Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </Stack>
      )}
    </VStack>
  )
}
