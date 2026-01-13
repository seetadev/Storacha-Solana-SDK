import { useUploadHistory } from '@/hooks/upload-history'
import type { Filter } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  CopyIcon,
  FileIcon,
  ImageIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  VideoIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

export const UploadHistory = () => {
  const { files, isLoading } = useUploadHistory()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Filter>('all')

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={24} weight="duotone" />
    }
    if (fileType.startsWith('video/')) {
      return <VideoIcon size={24} weight="duotone" />
    }
    return <FileIcon size={24} weight="duotone" />
  }

  const calculateDaysRemaining = (uploadedAt: string, duration: number) => {
    const uploadDate = new Date(uploadedAt)
    const expirationDate = new Date(uploadDate)
    expirationDate.setDate(expirationDate.getDate() + duration)
    const now = new Date()
    const diffTime = expirationDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('CID copied to clipboard')
  }

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || file.status === filterStatus
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <Box textAlign="center" py="4em">
        <Text color="var(--text-muted)" fontSize="var(--font-size-lg)">
          Loading your files...
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing="2em" align="stretch">
      <HStack spacing="1em">
        <Box position="relative" flex="1">
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            pl="2.5em"
            h="44px"
            bg="var(--bg-dark)"
            border="1px solid var(--border-hover)"
            borderRadius="var(--radius-md)"
            color="var(--text-inverse)"
            fontSize="var(--font-size-sm)"
            _hover={{
              borderColor: 'var(--border-hover)',
            }}
            _focus={{
              borderColor: 'var(--primary-500)',
              boxShadow: '0 0 0 1px var(--primary-500)',
            }}
            _placeholder={{
              color: 'var(--text-tertiary)',
            }}
          />
          <Box
            position="absolute"
            left="0.75em"
            top="50%"
            transform="translateY(-50%)"
          >
            <MagnifyingGlassIcon size={20} color="var(--text-muted)" />
          </Box>
        </Box>

        <HStack spacing="0.5em">
          {(['all', 'active', 'expired'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              h="44px"
              px="1.5em"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              bg={
                filterStatus === status
                  ? 'var(--primary-500)'
                  : 'var(--bg-dark)'
              }
              color={filterStatus === status ? 'white' : 'var(--text-muted)'}
              border="1px solid"
              borderColor={
                filterStatus === status
                  ? 'var(--primary-500)'
                  : 'var(--border-dark)'
              }
              borderRadius="var(--radius-md)"
              transition="all 0.2s"
              _hover={{
                bg:
                  filterStatus === status
                    ? 'var(--primary-600)'
                    : 'var(--lght-grey)',
                borderColor:
                  filterStatus === status
                    ? 'var(--primary-600)'
                    : 'var(--border-hover)',
              }}
              onClick={() => setFilterStatus(status)}
              textTransform="capitalize"
            >
              {status}
            </Button>
          ))}
        </HStack>
      </HStack>

      {filteredFiles.length === 0 ? (
        <Box
          textAlign="center"
          py="4em"
          px="2em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-hover)"
          borderRadius="var(--radius-lg)"
        >
          <FileIcon size={64} color="var(--text-tertiary)" weight="duotone" />
          <Text
            mt="1em"
            color="var(--text-muted)"
            fontSize="var(--font-size-lg)"
            fontWeight="var(--font-weight-medium)"
          >
            {searchTerm || filterStatus !== 'all'
              ? 'No files match your criteria'
              : 'No files uploaded yet'}
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="1.5em">
          {filteredFiles.map((file) => {
            const daysRemaining = calculateDaysRemaining(
              file.uploadedAt,
              file.duration,
            )
            const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0
            const isExpired = daysRemaining < 0

            return (
              <Box
                key={file.id}
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
                <HStack spacing="1em" mb="1em">
                  <Box
                    p="0.75em"
                    bg="rgba(249, 115, 22, 0.1)"
                    borderRadius="var(--radius-md)"
                    color="var(--primary-500)"
                  >
                    {getFileIcon(file.type)}
                  </Box>
                  <VStack spacing="0.25em" align="start" flex="1" minW="0">
                    <Text
                      fontSize="var(--font-size-sm)"
                      fontWeight="var(--font-weight-semibold)"
                      color="var(--text-inverse)"
                      noOfLines={1}
                      wordBreak="break-all"
                    >
                      {file.filename}
                    </Text>
                    <Text
                      fontSize="var(--font-size-xs)"
                      color="var(--text-muted)"
                    >
                      {formatFileSize(file.size)}
                    </Text>
                  </VStack>
                </HStack>

                <Stack spacing="0.75em">
                  <HStack
                    justify="space-between"
                    fontSize="var(--font-size-xs)"
                  >
                    <Text color="var(--text-tertiary)">Uploaded</Text>
                    <Text color="var(--text-muted)">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </Text>
                  </HStack>

                  <HStack
                    justify="space-between"
                    fontSize="var(--font-size-xs)"
                  >
                    <Text color="var(--text-tertiary)">Cost</Text>
                    <Text color="var(--text-muted)">
                      {file.cost.toFixed(6)} SOL
                    </Text>
                  </HStack>

                  <HStack
                    justify="space-between"
                    fontSize="var(--font-size-xs)"
                  >
                    <Text color="var(--text-tertiary)">Status</Text>
                    <Box
                      px="0.5em"
                      py="0.25em"
                      borderRadius="full"
                      bg={
                        isExpired
                          ? 'rgba(239, 68, 68, 0.1)'
                          : isExpiringSoon
                            ? 'rgba(245, 158, 11, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)'
                      }
                    >
                      <Text
                        fontSize="var(--font-size-xs)"
                        fontWeight="var(--font-weight-medium)"
                        color={
                          isExpired
                            ? 'var(--error)'
                            : isExpiringSoon
                              ? 'var(--warning)'
                              : 'var(--success)'
                        }
                      >
                        {isExpired
                          ? 'Expired'
                          : isExpiringSoon
                            ? `${daysRemaining}d left`
                            : `${daysRemaining}d left`}
                      </Text>
                    </Box>
                  </HStack>

                  <Box w="100%" h="1px" bg="var(--border-dark)" my="0.25em" />

                  <HStack spacing="0.5em">
                    <IconButton
                      aria-label="Copy CID"
                      icon={<CopyIcon size={16} />}
                      size="sm"
                      variant="ghost"
                      color="var(--text-muted)"
                      _hover={{
                        bg: 'var(--lght-grey)',
                        color: 'var(--primary-500)',
                      }}
                      onClick={() => copyToClipboard(file.cid)}
                    />
                    <IconButton
                      aria-label="View file"
                      icon={<LinkIcon size={16} />}
                      size="sm"
                      variant="ghost"
                      color="var(--text-muted)"
                      _hover={{
                        bg: 'var(--lght-grey)',
                        color: 'var(--primary-500)',
                      }}
                      onClick={() => window.open(file.url, '_blank')}
                    />
                  </HStack>
                </Stack>
              </Box>
            )
          })}
        </SimpleGrid>
      )}
    </VStack>
  )
}
