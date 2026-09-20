import { FileUpload } from '@/components/upload'
import { KuboNodeSelector } from '@/components/kubo-node-selector'
import { useNodeContext } from '@/hooks/context'
import { getApiBase, getMeshkitGuestId } from '@/lib/meshkit-guest'
import { formatFileSize } from '@/lib/utils'
import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  LockKeyIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

interface UploadedFileResult {
  name: string
  size: number
  type: string
  cid: string
  url: string
  retrieveUrl: string
}

interface UploadResult {
  cid: string
  url: string
  files: UploadedFileResult[]
  totalSize: number
  encrypted: boolean
  uploadedAt: string
}

const SECTION_LABEL_STYLE = {
  fontSize: '11px' as const,
  fontWeight: '600' as const,
  color: 'var(--text-muted)' as const,
  letterSpacing: '0.08em' as const,
  textTransform: 'uppercase' as const,
}

/**
 * MeshKit end-to-end upload UI.
 * Upload → pin via @ipfs-meshkit/meshkit on the server (Kubo :5001),
 * then retrieve via meshkit.retrieve() — no Solana / Filecoin / Pinata.
 */
export const Upload = () => {
  const { activeNode } = useNodeContext()
  const apiBase = getApiBase()

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [encryptPassword, setEncryptPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [retrievingCid, setRetrievingCid] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [copiedCid, setCopiedCid] = useState(false)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCid(true)
    setTimeout(() => setCopiedCid(false), 2000)
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) return

    setUploading(true)
    const toastId = toast.loading('Uploading via MeshKit…')

    try {
      const form = new FormData()
      selectedFiles.forEach((f) => form.append('file', f, f.name))
      form.append('userAddress', getMeshkitGuestId())
      if (encryptPassword.trim()) {
        form.append('encryptPassword', encryptPassword.trim())
      }

      const res = await fetch(`${apiBase}/upload/meshkit`, {
        method: 'POST',
        headers: {
          'X-Kubo-Node-URL': activeNode.apiUrl,
          'X-IPFS-Gateway-URL': activeNode.gatewayUrl,
        },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(
          (err as { message?: string; error?: string }).error ||
            (err as { message?: string }).message ||
            'Upload failed',
        )
      }

      const data = (await res.json()) as UploadResult
      setResult(data)
      setSelectedFiles([])
      toast.success(
        data.encrypted
          ? 'Encrypted & pinned via MeshKit'
          : 'Pinned via MeshKit',
        { id: toastId },
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed', {
        id: toastId,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRetrieve = async (file: UploadedFileResult) => {
    setRetrievingCid(file.cid)
    const toastId = toast.loading('Retrieving via MeshKit…')

    try {
      const url = new URL(
        `${apiBase}/upload/retrieve/${encodeURIComponent(file.cid)}`,
      )
      if (encryptPassword.trim()) {
        url.searchParams.set('password', encryptPassword.trim())
      }

      const res = await fetch(url.toString(), {
        headers: {
          'X-Kubo-Node-URL': activeNode.apiUrl,
        },
      })

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: 'Retrieve failed' }))
        throw new Error(
          (err as { error?: string; message?: string }).error ||
            (err as { message?: string }).message ||
            'Retrieve failed',
        )
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)

      toast.success('Retrieved via MeshKit', { id: toastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrieve failed', {
        id: toastId,
      })
    } finally {
      setRetrievingCid(null)
    }
  }

  const resetUpload = () => {
    setResult(null)
    setSelectedFiles([])
  }

  if (result) {
    return (
      <VStack spacing="1.5em" align="stretch">
        <HStack spacing="0.75em">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="40px"
            h="40px"
            borderRadius="12px"
            bg="rgba(34,197,94,0.12)"
            border="1px solid rgba(34,197,94,0.3)"
            flexShrink={0}
          >
            <CheckCircleIcon size={22} color="#22c55e" weight="fill" />
          </Box>
          <VStack align="start" spacing="0">
            <Text fontSize="16px" fontWeight="600" color="var(--text-inverse)">
              {result.encrypted ? 'Encrypted & pinned' : 'Pinned to IPFS'}
            </Text>
            <Text fontSize="13px" color="var(--text-muted)">
              {result.files.length} file{result.files.length !== 1 ? 's' : ''} ·{' '}
              {formatFileSize(result.totalSize)} · via {activeNode.label} ·
              MeshKit
            </Text>
          </VStack>
        </HStack>

        <Box
          p="1em"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="12px"
        >
          <Text {...SECTION_LABEL_STYLE} mb="0.5em">
            Primary CID
          </Text>
          <HStack spacing="0.5em">
            <Text
              fontSize="13px"
              color="var(--text-inverse)"
              fontFamily="mono"
              flex={1}
              noOfLines={1}
              wordBreak="break-all"
            >
              {result.cid}
            </Text>
            <Box
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="28px"
              h="28px"
              borderRadius="7px"
              bg={copiedCid ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)'}
              border={`1px solid ${copiedCid ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`}
              color={copiedCid ? '#22c55e' : 'var(--text-muted)'}
              cursor="pointer"
              title={copiedCid ? 'Copied!' : 'Copy CID'}
              onClick={() => copyToClipboard(result.cid)}
            >
              <CopyIcon size={14} />
            </Box>
          </HStack>
        </Box>

        <VStack spacing="0.5em" align="stretch">
          <Text {...SECTION_LABEL_STYLE}>Files — retrieve via MeshKit</Text>
          {result.files.map((f) => (
            <HStack
              key={f.cid}
              spacing="0.75em"
              p="0.85em 1em"
              bg="rgba(255,255,255,0.03)"
              border="1px solid rgba(255,255,255,0.08)"
              borderRadius="10px"
            >
              <VStack align="start" spacing="0" flex={1} minW={0}>
                <Text
                  fontSize="13px"
                  color="var(--text-inverse)"
                  noOfLines={1}
                  fontWeight="500"
                >
                  {f.name}
                </Text>
                <Text
                  fontSize="11px"
                  color="var(--text-muted)"
                  fontFamily="mono"
                  noOfLines={1}
                >
                  {f.cid}
                </Text>
              </VStack>
              <Text fontSize="12px" color="var(--text-muted)" flexShrink={0}>
                {formatFileSize(f.size)}
              </Text>
              <Button
                size="xs"
                leftIcon={<DownloadSimpleIcon size={14} />}
                bg="var(--primary-500)"
                color="white"
                _hover={{ bg: 'var(--primary-600)' }}
                isLoading={retrievingCid === f.cid}
                loadingText="…"
                onClick={() => handleRetrieve(f)}
              >
                Retrieve
              </Button>
              <Box
                as="button"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="28px"
                h="28px"
                borderRadius="7px"
                bg="rgba(255,255,255,0.05)"
                border="1px solid rgba(255,255,255,0.1)"
                color="var(--text-muted)"
                cursor="pointer"
                title="Open gateway URL"
                onClick={() => window.open(f.url, '_blank')}
                _hover={{ color: 'var(--primary-500)' }}
              >
                <ArrowSquareOutIcon size={14} />
              </Box>
            </HStack>
          ))}
        </VStack>

        {result.encrypted && (
          <HStack
            spacing="0.6em"
            p="0.8em 1em"
            bg="rgba(249,115,22,0.08)"
            border="1px solid rgba(249,115,22,0.2)"
            borderRadius="10px"
          >
            <LockKeyIcon size={16} color="var(--primary-500)" />
            <Text fontSize="12px" color="var(--text-muted)">
              Content was encrypted with your password. Use the same password
              when retrieving.
            </Text>
          </HStack>
        )}

        <Button
          variant="outline"
          size="sm"
          borderColor="rgba(255,255,255,0.1)"
          color="var(--text-muted)"
          _hover={{
            borderColor: 'var(--primary-500)',
            color: 'var(--primary-500)',
          }}
          onClick={resetUpload}
          alignSelf="flex-start"
        >
          Upload another file
        </Button>
      </VStack>
    )
  }

  return (
    <VStack spacing="1.5em" align="stretch">
      <HStack spacing="0.75em">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="40px"
          h="40px"
          borderRadius="12px"
          bg="rgba(249,115,22,0.12)"
          border="1px solid rgba(249,115,22,0.3)"
          flexShrink={0}
        >
          <UploadSimpleIcon
            size={22}
            color="var(--primary-500)"
            weight="fill"
          />
        </Box>
        <VStack align="start" spacing="0">
          <Text fontSize="16px" fontWeight="600" color="var(--text-inverse)">
            Upload with MeshKit
          </Text>
          <Text fontSize="13px" color="var(--text-muted)">
            Pin to your Kubo node · retrieve with meshkit.retrieve()
          </Text>
        </VStack>
      </HStack>

      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          IPFS Node
        </Text>
        <KuboNodeSelector apiBase={apiBase} />
      </Box>

      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Files
        </Text>
        <FileUpload onFilesSelected={setSelectedFiles} />
      </Box>

      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Encryption (optional)
        </Text>
        <Input
          type="password"
          placeholder="Password for MeshKit AES-256-GCM encrypt"
          value={encryptPassword}
          onChange={(e) => setEncryptPassword(e.target.value)}
          size="sm"
          bg="rgba(255,255,255,0.04)"
          border="1px solid rgba(255,255,255,0.1)"
          color="var(--text-inverse)"
          _placeholder={{ color: 'var(--text-muted)' }}
          _focus={{ borderColor: 'var(--primary-500)', boxShadow: 'none' }}
          borderRadius="8px"
        />
        <Text fontSize="11px" color="var(--text-muted)" mt="0.4em">
          Leave blank for plaintext. Same password is required on retrieve.
        </Text>
      </Box>

      <Button
        onClick={handleUpload}
        isLoading={uploading}
        loadingText="Pinning via MeshKit…"
        isDisabled={!selectedFiles.length || uploading}
        height="48px"
        bg="var(--primary-500)"
        color="white"
        borderRadius="12px"
        fontWeight="600"
        fontSize="15px"
        leftIcon={
          encryptPassword.trim() ? (
            <LockKeyIcon size={20} weight="bold" />
          ) : (
            <UploadSimpleIcon size={20} weight="bold" />
          )
        }
        _hover={{
          bg: 'var(--primary-600)',
          boxShadow: '0 0 20px rgba(249,115,22,0.3)',
        }}
        _disabled={{
          opacity: 0.45,
          cursor: 'not-allowed',
          _hover: { bg: 'var(--primary-500)', boxShadow: 'none' },
        }}
        transition="all 0.2s"
        alignSelf="stretch"
      >
        {!selectedFiles.length
          ? 'Select files to upload'
          : encryptPassword.trim()
            ? `Encrypt & pin ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
            : `Pin ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} with MeshKit`}
      </Button>

      <HStack
        spacing="0.6em"
        p="0.8em 1em"
        bg="rgba(249,115,22,0.06)"
        border="1px solid rgba(249,115,22,0.15)"
        borderRadius="10px"
      >
        <Text fontSize="12px" color="var(--text-muted)" lineHeight="1.5">
          Uses{' '}
          <Text as="span" color="var(--text-inverse)" fontFamily="mono">
            @ipfs-meshkit/meshkit
          </Text>{' '}
          upload + pin against your node at{' '}
          <Text as="span" color="var(--text-inverse)" fontFamily="mono">
            {activeNode.apiUrl}
          </Text>
          . No Solana, Filecoin, or Pinata payment.
        </Text>
      </HStack>
    </VStack>
  )
}
