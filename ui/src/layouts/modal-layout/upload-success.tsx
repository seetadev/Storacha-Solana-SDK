import { Box, Button, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { formatFileSize, formatSOL, formatUSD } from '@/lib/utils'
import { ModalLayout } from './modal'

interface UploadSuccessProps {
  isOpen: boolean
  onClose: () => void
  uploadInfo: {
    cid: string
    fileName?: string
    fileSize: number
    fileCount: number
    duration: number
    costInSOL: number
    costInUSD: number
    transactionHash: string
  }
}

export const UploadSuccess = ({
  isOpen,
  onClose,
  uploadInfo,
}: UploadSuccessProps) => {
  const navigate = useNavigate()

  const viewUploadHistory = () => {
    onClose()
    navigate({ to: '/app/history' })
  }

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noCloseButton={false}
    >
      <VStack spacing="2em" py="1em" align="stretch">
        <Box className="checkmark-container">
          <svg viewBox="0 0 100 100">
            <circle
              className="success-circle"
              cx="50"
              cy="50"
              r="45"
              fill="rgba(16, 185, 129, 0.1)"
              stroke="#10b981"
              strokeWidth="2"
            />
            <path
              className="success-checkmark"
              d="M 30 50 L 45 65 L 70 35"
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Box>

        <VStack spacing="0.5em" className="fade-in-delay-1">
          <Text
            fontSize="var(--font-size-2xl)"
            fontWeight="var(--font-weight-bold)"
            color="var(--text-inverse)"
            textAlign="center"
          >
            Upload Successful!
          </Text>
          <Text
            fontSize="var(--font-size-sm)"
            color="var(--text-muted)"
            textAlign="center"
          >
            Your {uploadInfo.fileCount > 1 ? 'files are' : 'file is'} now stored
            on IPFS
          </Text>
        </VStack>

        <Stack
          spacing="1em"
          p="1.5em"
          bg="var(--bg-dark)"
          borderRadius="var(--radius-lg)"
          border="1px solid var(--border-hover)"
          className="fade-in-delay-2"
        >
          {uploadInfo.fileName && (
            <HStack justify="space-between">
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                File
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                color="var(--text-inverse)"
                fontWeight="var(--font-weight-medium)"
                maxW="200px"
                isTruncated
              >
                {uploadInfo.fileName}
              </Text>
            </HStack>
          )}

          {uploadInfo.fileCount > 1 && (
            <HStack justify="space-between">
              <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
                Files
              </Text>
              <Text
                fontSize="var(--font-size-sm)"
                color="var(--text-inverse)"
                fontWeight="var(--font-weight-medium)"
              >
                {uploadInfo.fileCount} files
              </Text>
            </HStack>
          )}

          <HStack justify="space-between">
            <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
              Size
            </Text>
            <Text
              fontSize="var(--font-size-sm)"
              color="var(--text-inverse)"
              fontWeight="var(--font-weight-medium)"
            >
              {formatFileSize(uploadInfo.fileSize)}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
              Duration
            </Text>
            <Text
              fontSize="var(--font-size-sm)"
              color="var(--text-inverse)"
              fontWeight="var(--font-weight-medium)"
            >
              {uploadInfo.duration} days
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
              Cost
            </Text>
            <VStack align="flex-end" spacing="0">
              <Text
                fontSize="var(--font-size-sm)"
                color="var(--text-inverse)"
                fontWeight="var(--font-weight-medium)"
              >
                {formatSOL(uploadInfo.costInSOL)} SOL
              </Text>
              <Text fontSize="var(--font-size-xs)" color="var(--text-muted)">
                {formatUSD(uploadInfo.costInUSD)}
              </Text>
            </VStack>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
              CID
            </Text>
            <Text
              fontSize="var(--font-size-xs)"
              color="#10b981"
              fontFamily="var(--font-family-mono)"
              maxW="180px"
              isTruncated
            >
              {uploadInfo.cid}
            </Text>
          </HStack>
        </Stack>

        <Button
          onClick={viewUploadHistory}
          size="lg"
          height="48px"
          fontSize="var(--font-size-base)"
          fontWeight="var(--font-weight-semibold)"
          bg="var(--text-inverse)"
          color="var(--eerie-black)"
          borderRadius="var(--radius-lg)"
          transition="all 0.2s ease"
          _hover={{
            bg: 'var(--text-inverse)',
            transform: 'translateY(-1px)',
            boxShadow:
              '0 4px 12px rgba(24, 24, 23, 0.4), 0 0 20px rgba(249, 115, 22, 0.2)',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          rightIcon={<ArrowRightIcon size={20} weight="bold" />}
          className="fade-in-delay-3"
        >
          View Upload History
        </Button>

        <Text
          fontSize="var(--font-size-xs)"
          color="var(--text-muted)"
          textAlign="center"
          className="fade-in-delay-4"
        >
          Your files will be available on IPFS within a few minutes
        </Text>
      </VStack>
    </ModalLayout>
  )
}
