import { formatFileSize } from '@/lib/utils'
import { Box, Center, HStack, Text, VStack } from '@chakra-ui/react'
import {
  CheckCircleIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone'

interface DropZoneProps {
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
  isDragActive: boolean
  isDragReject: boolean
  maxFiles: number
  maxSize: number
}

export const DropZone = ({
  getRootProps,
  getInputProps,
  isDragActive,
  isDragReject,
  maxFiles,
  maxSize,
}: DropZoneProps) => {
  return (
    <Center
      {...getRootProps()}
      p="3em"
      border="2px dashed"
      borderColor={
        isDragReject
          ? 'var(--error)'
          : isDragActive
            ? 'var(--primary-500)'
            : 'var(--border-hover)'
      }
      borderRadius="var(--radius-lg)"
      bg={
        isDragReject
          ? 'rgba(239, 68, 68, 0.05)'
          : isDragActive
            ? 'rgba(249, 115, 22, 0.08)'
            : 'var(--bg-dark)'
      }
      cursor="pointer"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      w="100%"
      textAlign="center"
      position="relative"
      overflow="hidden"
      _hover={{
        borderColor: isDragReject ? 'var(--error)' : 'var(--primary-500)',
        bg: isDragReject
          ? 'rgba(239, 68, 68, 0.08)'
          : 'rgba(249, 115, 22, 0.05)',
        transform: 'scale(1.01)',
      }}
      _active={{
        transform: 'scale(0.99)',
      }}
    >
      <input {...getInputProps()} />

      {isDragActive && !isDragReject && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgGradient="linear(to-br, transparent, rgba(249, 115, 22, 0.1))"
          pointerEvents="none"
          animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
        />
      )}

      <VStack spacing="1em" position="relative" zIndex={1}>
        <Box
          p="1em"
          borderRadius="var(--radius-xl)"
          bg={
            isDragReject
              ? 'rgba(239, 68, 68, 0.1)'
              : isDragActive
                ? 'rgba(249, 115, 22, 0.15)'
                : 'rgba(255, 255, 255, 0.03)'
          }
          transition="all 0.3s ease"
        >
          {isDragReject ? (
            <XCircleIcon size={48} color="var(--error)" weight="duotone" />
          ) : isDragActive ? (
            <CheckCircleIcon size={48} color="var(--primary-500)" />
          ) : (
            <UploadSimpleIcon size={48} color="var(--text-muted)" />
          )}
        </Box>

        <VStack spacing="0.5em">
          <Text
            fontWeight="var(--font-weight-semibold)"
            fontSize="var(--font-size-lg)"
            color={isDragReject ? 'var(--error)' : 'var(--text-inverse)'}
          >
            {isDragReject
              ? 'Invalid files detected'
              : isDragActive
                ? 'Drop files here'
                : 'Upload your files'}
          </Text>

          <Text
            fontSize="var(--font-size-sm)"
            color="var(--text-muted)"
            lineHeight="var(--line-height-relaxed)"
          >
            {isDragActive
              ? 'Release to upload'
              : 'Drag & drop files here, or click to browse'}
          </Text>

          <HStack
            spacing="0.5em"
            pt="0.5em"
            fontSize="var(--font-size-xs)"
            color="var(--text-tertiary)"
          >
            <Text>Max {maxFiles} files</Text>
            <Text>•</Text>
            <Text>Up to {formatFileSize(maxSize)} each</Text>
          </HStack>
        </VStack>
      </VStack>
    </Center>
  )
}
