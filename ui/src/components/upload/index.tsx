import { Button, HStack, VStack } from '@chakra-ui/react'
import { FolderIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { DropZone } from './drop-zone'
import { ErrorList } from './error-list'
import type { FileWithPreview } from './file-item'
import { FileList } from './file-list'

interface FileUploadProps {
  onFilesSelected: (files: Array<File>) => void
  maxFiles?: number
  maxSize?: number
  allowDirectories?: boolean
}

export const FileUpload = ({
  onFilesSelected,
  maxFiles = 100,
  maxSize = 1024 * 1024 * 1024,
  allowDirectories = false,
}: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Array<FileWithPreview>>([])
  const [errors, setErrors] = useState<Array<string>>([])
  const folderInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (files: Array<File>) => {
      const newErrors: Array<string> = []

      const validFiles = files.filter((file) => {
        if (file.size > maxSize) {
          newErrors.push(
            `${file.name} is too large. Max size is ${maxSize / (1024 * 1024)}MB.`,
          )
          return false
        }
        return true
      })

      // check how much (files) left we can select
      const remainingSlots = maxFiles - selectedFiles.length
      if (validFiles.length > remainingSlots) {
        newErrors.push(`Maximum ${maxFiles} files allowed.`)
        validFiles.splice(remainingSlots)
      }

      if (newErrors.length > 0) {
        setErrors(newErrors)
      } else {
        setErrors([])
      }

      if (validFiles.length > 0) {
        const filesWithId: Array<FileWithPreview> = validFiles.map((file) => {
          const fileWithId = Object.assign(file, {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            preview: file.type.startsWith('image/')
              ? URL.createObjectURL(file)
              : undefined,
          })
          return fileWithId
        })

        const combined = [...selectedFiles, ...filesWithId]
        setSelectedFiles(combined)
        onFilesSelected(combined)
      }
    },
    [onFilesSelected, maxSize, maxFiles, selectedFiles],
  )

  const onDrop = useCallback(
    (acceptedFiles: Array<File>, rejectedFiles: Array<any>) => {
      const newErrors: Array<string> = []

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors: fileErrors }) => {
          fileErrors.forEach((error: any) => {
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
      }

      if (acceptedFiles.length > 0) {
        processFiles(acceptedFiles)
      }
    },
    [processFiles, maxSize, maxFiles],
  )

  const handleFolderSelect = useCallback(() => {
    folderInputRef.current?.click()
  }, [])

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files)
        processFiles(files)
      }
      // reset input so same folder can be selected again
      e.target.value = ''
    },
    [processFiles],
  )

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId)
      onFilesSelected(updated)

      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove?.preview) URL.revokeObjectURL(fileToRemove.preview)
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
      useFsAccessApi: false,
    })

  return (
    <VStack spacing="1.5em" w="100%" align="stretch">
      {/* Hidden folder input - completely separate from dropzone */}
      {allowDirectories && (
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in the type
          webkitdirectory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderChange}
        />
      )}

      {selectedFiles.length === 0 && (
        <>
          <DropZone
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            isDragReject={isDragReject}
            maxFiles={maxFiles}
            maxSize={maxSize}
          />

          {allowDirectories && (
            <HStack justify="center">
              <Button
                onClick={handleFolderSelect}
                size="sm"
                variant="ghost"
                color="var(--primary-500)"
                fontWeight="var(--font-weight-medium)"
                fontSize="var(--font-size-sm)"
                leftIcon={<FolderIcon size={16} weight="duotone" />}
                _hover={{
                  bg: 'rgba(249, 115, 22, 0.1)',
                }}
              >
                Or select a folder
              </Button>
            </HStack>
          )}
        </>
      )}

      <ErrorList errors={errors} />

      {selectedFiles.length > 0 && (
        <FileList
          files={selectedFiles}
          onRemove={removeFile}
          onClearAll={clearAllFiles}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          allowDirectories={allowDirectories}
          onDirectorySelect={handleFolderChange}
        />
      )}
    </VStack>
  )
}
