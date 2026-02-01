import { HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { FolderIcon, PlusIcon } from '@phosphor-icons/react'
import { useRef } from 'react'
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone'
import type { FileWithPreview } from './file-item'
import { FileItem } from './file-item'

interface FileListProps {
  files: Array<FileWithPreview>
  onRemove: (fileId: string) => void
  onClearAll: () => void
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
  allowDirectories?: boolean
  onDirectorySelect?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const FileList = ({
  files,
  onRemove,
  onClearAll,
  getRootProps,
  getInputProps,
  allowDirectories = false,
  onDirectorySelect,
}: FileListProps) => {
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFolderClick = () => {
    folderInputRef.current?.click()
  }

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
            <Text>Add files</Text>
          </HStack>
          {allowDirectories && (
            <>
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is not in the type
                webkitdirectory=""
                multiple
                style={{ display: 'none' }}
                onChange={onDirectorySelect}
              />
              <HStack
                spacing="0.5em"
                cursor="pointer"
                fontSize="var(--font-size-xs)"
                color="var(--text-muted)"
                _hover={{ color: 'var(--primary-500)' }}
                transition="color 0.2s"
                onClick={handleFolderClick}
              >
                <FolderIcon size={14} weight="bold" />
                <Text>Add folder</Text>
              </HStack>
            </>
          )}
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
