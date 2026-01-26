import { VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
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

  const onDrop = useCallback(
    (acceptedFiles: Array<File>, rejectedFiles: Array<any>) => {
      const newErrors: Array<string> = []

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file }) => {
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

        const combined = [...selectedFiles, ...filesWithId]
        setSelectedFiles(combined)
        onFilesSelected(combined)
      }
    },
    [onFilesSelected, maxSize, maxFiles, selectedFiles],
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

  const inputProps = {
    ...getInputProps(),
    ...(allowDirectories && { webkitdirectory: '' as any })
  }

  return (
    <VStack spacing="1.5em" w="100%" align="stretch">
      {selectedFiles.length === 0 && (
        <DropZone
          getRootProps={getRootProps}
          getInputProps={() => inputProps}
          isDragActive={isDragActive}
          isDragReject={isDragReject}
          maxFiles={maxFiles}
          maxSize={maxSize}
        />
      )}

      <ErrorList errors={errors} />

      {selectedFiles.length > 0 && (
        <FileList
          files={selectedFiles}
          onRemove={removeFile}
          onClearAll={clearAllFiles}
          getRootProps={getRootProps}
          getInputProps={() => inputProps}
        />
      )}
    </VStack>
  )
}
