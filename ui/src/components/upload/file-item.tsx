import { Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  VideoIcon,
} from '@phosphor-icons/react'
import { formatFileSize } from '@/lib/utils'

export type FileWithPreview = File & {
  preview?: string
  id: string
}

const getFileIcon = (file: File) => {
  const type = file.type.split('/')[0]

  if (type === 'image') {
    return <ImageIcon size={24} weight="duotone" />
  }

  if (type === 'video') {
    return <VideoIcon size={24} weight="duotone" />
  }

  return <FileIcon size={24} weight="duotone" />
}

interface FileItemProps {
  file: FileWithPreview
  onRemove: (fileId: string) => void
}

export const FileItem = ({ file, onRemove }: FileItemProps) => {
  return (
    <HStack
      p="1em"
      bg="var(--bg-dark)"
      border="1px solid var(--border-dark)"
      borderRadius="var(--radius-md)"
      spacing="1em"
      transition="all 0.2s ease"
      borderColor="rgba(255, 255, 255, 0.08)"
      _hover={{
        cursor: 'pointer',
        bg: 'var(--lght-grey)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <Box
        boxSize="48px"
        borderRadius="var(--radius-md)"
        bg="rgba(255, 255, 255, 0.03)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        flexShrink={0}
        border="1px solid var(--border-light)"
      >
        {file.preview ? (
          <Box
            as="img"
            src={file.preview}
            alt={file.name}
            boxSize="100%"
            objectFit="cover"
          />
        ) : (
          <Box color="var(--primary-500)">{getFileIcon(file)}</Box>
        )}
      </Box>

      <VStack spacing="0.25em" align="start" flex="1" minW="0">
        <Text
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-inverse)"
          noOfLines={1}
          wordBreak="break-all"
        >
          {file.name}
        </Text>
        <HStack spacing="0.5em" fontSize="var(--font-size-xs)">
          <Text color="var(--text-muted)">{formatFileSize(file.size)}</Text>
          <Text color="var(--text-tertiary)">•</Text>
          <Text color="var(--text-muted)" textTransform="uppercase">
            {file.type.split('/')[1] || 'file'}
          </Text>
        </HStack>
      </VStack>

      <IconButton
        aria-label="Remove file"
        icon={<TrashIcon size={18} weight="bold" />}
        size="sm"
        variant="ghost"
        colorScheme="red"
        borderRadius="var(--radius-md)"
        color="var(--text-muted)"
        _hover={{
          bg: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--error)',
        }}
        onClick={() => onRemove(file.id)}
        flexShrink={0}
      />
    </HStack>
  )
}
