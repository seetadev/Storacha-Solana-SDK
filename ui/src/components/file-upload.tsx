import {
  Box,
  Center,
  HStack,
  IconButton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  CheckCircleIcon,
  FileIcon,
  ImageIcon,
  TrashIcon,
  UploadSimpleIcon,
  VideoIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onFilesSelected: (files: Array<File>) => void
  maxFiles?: number
  maxSize?: number
}

type FileWithPreview = File & {
  preview?: string
  id: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
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

export const FileUpload = ({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024,
}: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Array<FileWithPreview>>([])
  const [errors, setErrors] = useState<Array<string>>([])

  const onDrop = useCallback(
    (acceptedFiles: Array<File>, rejectedFiles: Array<any>) => {
      const newErrors: Array<string> = []

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          errors.forEach((error: any) => {
            if (error.code === 'file-too-large') {
              newErrors.push(
                `${file.name} is too large. Max size is ${maxSize / (1024 * 1024)}MB.`,
              )
            } else if (error.code === 'too-many-files') {
              newErrors.push(`Maximum ${maxFiles} files allowed.`)
            } else {
              newErrors.push(`Error with ${file.name}: ${error.message}`)
            }
          })
        })
        setErrors(newErrors)
      } else {
        setErrors([])
      }

      if (acceptedFiles.length > 0) {
        const filesWithId: Array<FileWithPreview> = acceptedFiles.map(
          (file) => {
            const fileWithId = Object.assign(file, {
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              preview: file.type.startsWith('image/')
                ? URL.createObjectURL(file)
                : undefined,
            })
            return fileWithId
          },
        )

        setSelectedFiles((prev) => {
          const combined = [...prev, ...filesWithId]
          onFilesSelected(combined)
          return combined
        })
      }
    },
    [onFilesSelected, maxSize, maxFiles],
  )

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId)
      onFilesSelected(updated)

      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }

      return updated
    })
  }

  const clearAllFiles = () => {
    selectedFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })

    setSelectedFiles([])
    onFilesSelected([])
    setErrors([])
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      maxFiles,
      maxSize,
    })

  return (
    <VStack spacing="1.5em" w="100%" align="stretch">
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
              <CheckCircleIcon
                size={48}
                color="var(--primary-500)"
                weight="duotone"
              />
            ) : (
              <UploadSimpleIcon
                size={48}
                color="var(--text-muted)"
                weight="duotone"
              />
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
              <Text>Up to {maxSize / (1024 * 1024)}MB each</Text>
            </HStack>
          </VStack>
        </VStack>
      </Center>

      {errors.length > 0 && (
        <VStack
          spacing="0.75em"
          align="stretch"
          p="1em"
          bg="rgba(239, 68, 68, 0.05)"
          border="1px solid rgba(239, 68, 68, 0.2)"
          borderRadius="var(--radius-md)"
        >
          {errors.map((error, index) => (
            <HStack key={index} spacing="0.75em">
              <WarningCircleIcon size={18} color="var(--error)" weight="fill" />
              <Text
                fontSize="var(--font-size-sm)"
                color="var(--error)"
                lineHeight="var(--line-height-snug)"
              >
                {error}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}

      {selectedFiles.length > 0 && (
        <VStack spacing="1em" align="stretch">
          <HStack justify="space-between" align="center">
            <Text
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              color="var(--text-muted)"
            >
              Selected Files ({selectedFiles.length})
            </Text>
            <Text
              fontSize="var(--font-size-xs)"
              color="var(--text-muted)"
              cursor="pointer"
              _hover={{ color: 'var(--error)' }}
              transition="color 0.2s"
              onClick={clearAllFiles}
            >
              Clear all
            </Text>
          </HStack>

          <Stack spacing="0.75em">
            {selectedFiles.map((file) => (
              <HStack
                key={file.id}
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
                    <Text color="var(--text-muted)">
                      {formatFileSize(file.size)}
                    </Text>
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
                  onClick={() => removeFile(file.id)}
                  flexShrink={0}
                />
              </HStack>
            ))}
          </Stack>
        </VStack>
      )}
    </VStack>
  )
}
