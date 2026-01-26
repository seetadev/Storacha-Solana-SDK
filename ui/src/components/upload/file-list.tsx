import { HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { PlusIcon } from '@phosphor-icons/react'
import type { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone'
import type { FileWithPreview } from './file-item'
import { FileItem } from './file-item'

interface FileListProps {
  files: Array<FileWithPreview>
  onRemove: (fileId: string) => void
  onClearAll: () => void
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
}

export const FileList = ({
  files,
  onRemove,
  onClearAll,
  getRootProps,
  getInputProps,
}: FileListProps) => {
  return (
    <VStack spacing="1em" align="stretch">
      <HStack justify="space-between" align="center">
        <Text
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-muted)"
        >
          Selected Files ({files.length})
        </Text>
        <HStack spacing="1em">
          <HStack
            {...getRootProps()}
            spacing="0.5em"
            cursor="pointer"
            fontSize="var(--font-size-xs)"
            color="var(--text-muted)"
            _hover={{ color: 'var(--primary-500)' }}
            transition="color 0.2s"
          >
            <input {...getInputProps()} />
            <PlusIcon size={14} weight="bold" />
            <Text>Add more files</Text>
          </HStack>
          <Text
            fontSize="var(--font-size-xs)"
            color="var(--text-muted)"
            cursor="pointer"
            _hover={{ color: 'var(--error)' }}
            transition="color 0.2s"
            onClick={onClearAll}
          >
            Clear all
          </Text>
        </HStack>
      </HStack>

      <Stack spacing="0.75em">
        {files.map((file) => (
          <FileItem key={file.id} file={file} onRemove={onRemove} />
        ))}
      </Stack>
    </VStack>
  )
}
