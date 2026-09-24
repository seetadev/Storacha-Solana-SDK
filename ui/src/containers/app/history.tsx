import {
  Box,
  Button,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  DownloadSimpleIcon,
  FileIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  VideoIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useNodeContext } from '@/hooks/context'
import { PreviewPane } from '@/components/file-preview'
import { usePptPayment } from '@/hooks/use-ppt-payment'
import { useUploadHistory } from '@/hooks/upload-history'
import { getApiBase } from '@/lib/meshkit-guest'
import { waitForTxReceipt } from '@/lib/wait-tx'
import type { Filter } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'

export const UploadHistory = () => {
  const { address } = useAccount()
  const { files, isLoading, error } = useUploadHistory()
  const { activeNode } = useNodeContext()
  const ppt = usePptPayment()
  const apiBase = getApiBase()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Filter>('all')
  const [retrievingCid, setRetrievingCid] = useState<string | null>(null)
  const [pwdByCid, setPwdByCid] = useState<Record<string, string | undefined>>(
    {},
  )
  const [previewByCid, setPreviewByCid] = useState<
    Record<string, { url: string; type: string; name: string } | undefined>
  >({})

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const retrieveFile = async (
    cid: string,
    filename: string,
    password?: string,
  ) => {
    if (!ppt.isConnected || !ppt.address) {
      ppt.connectWallet()
      toast.message('Connect MetaMask to pay 1 PPT for retrieve')
      return
    }

    setRetrievingCid(cid)
    const toastId = toast.loading('Paying 1 PPT for retrieve…')
    try {
      if (!ppt.isOnPptChain) await ppt.ensureChain()
      const txHash = await ppt.payOnePpt()
      await waitForTxReceipt(txHash)

      toast.loading('Retrieving via MeshKit…', { id: toastId })

      const url = new URL(
        `${apiBase}/upload/retrieve/${encodeURIComponent(cid)}`,
      )
      if (password) {
        url.searchParams.set('password', password)
      }
      url.searchParams.set('txHash', txHash)
      url.searchParams.set('userAddress', ppt.address.toLowerCase())

      const res = await fetch(url.toString(), {
        headers: {
          'X-Kubo-Node-URL': activeNode.apiUrl,
          'X-PPT-Tx-Hash': txHash,
          'X-User-Address': ppt.address.toLowerCase(),
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string; message?: string }).error ||
            (err as { message?: string }).message ||
            'Retrieve failed',
        )
      }
      const blob = await res.blob()
      const blobType = blob.type || 'application/octet-stream'

      const viewable =
        blobType.startsWith('image/') ||
        blobType.startsWith('video/') ||
        blobType.startsWith('audio/') ||
        blobType === 'application/pdf' ||
        blobType.startsWith('text/')
      if (viewable) {
        const objectUrl = URL.createObjectURL(blob)
        setPreviewByCid((prev) => {
          const old = prev[cid]
          if (old) URL.revokeObjectURL(old.url)
          return {
            ...prev,
            [cid]: { url: objectUrl, type: blobType, name: filename },
          }
        })
        toast.success('Paid 1 PPT \u00b7 retrieved \u2014 preview below', {
          id: toastId,
        })
      } else {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
        toast.success('Paid 1 PPT \u00b7 retrieved via MeshKit', {
          id: toastId,
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrieve failed', {
        id: toastId,
      })
    } finally {
      setRetrievingCid(null)
    }
  }

  const visibleFiles = files.filter(
    (file) => !String(file.filename || '').startsWith('retrieve:'),
  )

  const filteredFiles = visibleFiles.filter((file) => {
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
          Loading your MeshKit uploads…
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box textAlign="center" py="4em">
        <Text color="var(--text-muted)" fontSize="var(--font-size-lg)">
          Could not load upload history
        </Text>
        <Text
          color="var(--text-muted)"
          fontSize="var(--font-size-sm)"
          mt="0.5em"
        >
          {error instanceof Error ? error.message : 'Request failed'}
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing="2em" align="stretch">
      {!address && (
        <HStack
          p="0.85em 1em"
          bg="rgba(249,115,22,0.06)"
          border="1px solid rgba(249,115,22,0.15)"
          borderRadius="10px"
          justify="space-between"
        >
          <Text fontSize="13px" color="var(--text-muted)">
            Connect MetaMask (Arbitrum Sepolia) to retrieve — 1 PPT each
          </Text>
          <Button size="sm" onClick={ppt.connectWallet}>
            Connect
          </Button>
        </HStack>
      )}

      <HStack spacing="1em">
        <Box position="relative" flex="1">
          <Input
            placeholder="Search files…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            pl="2.5em"
            bg="rgba(255,255,255,0.04)"
            border="1px solid rgba(255,255,255,0.1)"
            color="var(--text-inverse)"
            _placeholder={{ color: 'var(--text-muted)' }}
          />
          <Box
            position="absolute"
            left="0.75em"
            top="50%"
            transform="translateY(-50%)"
            color="var(--text-muted)"
          >
            <MagnifyingGlassIcon size={18} />
          </Box>
        </Box>
      </HStack>

      <Stack direction="row" spacing="0.5em">
        {(['all', 'active', 'expired'] as Array<Filter>).map((f) => (
          <Button
            key={f}
            size="sm"
            variant="ghost"
            className={filterStatus === f ? 'pill pill-active' : 'pill'}
            onClick={() => setFilterStatus(f)}
            textTransform="capitalize"
          >
            {f}
          </Button>
        ))}
      </Stack>

      {filteredFiles.length === 0 ? (
        <Box textAlign="center" py="3em">
          <Text color="var(--text-muted)">
            {address
              ? 'No MeshKit uploads for this wallet yet'
              : 'Connect MetaMask to see uploads from this wallet'}
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="1em">
          {filteredFiles.map((file) => {
            const daysLeft = calculateDaysRemaining(
              file.uploadedAt,
              file.duration,
            )
            return (
              <Box
                key={`${file.cid}-${file.filename}`}
                className="history-card"
                p="1.25em"
                bg="rgba(255,255,255,0.03)"
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="12px"
              >
                <HStack justify="space-between" mb="0.75em" align="start">
                  <HStack>
                    {getFileIcon(file.type)}
                    <VStack align="start" spacing="0">
                      <Text
                        fontSize="14px"
                        fontWeight="600"
                        color="var(--text-inverse)"
                        noOfLines={1}
                      >
                        {file.filename}
                      </Text>
                      <Text fontSize="12px" color="var(--text-muted)">
                        {formatFileSize(file.size)} · {daysLeft}d left
                      </Text>
                    </VStack>
                  </HStack>
                </HStack>
                <Button
                  size="sm"
                  leftIcon={<DownloadSimpleIcon size={16} />}
                  onClick={() =>
                    retrieveFile(
                      file.cid,
                      file.filename,
                      pwdByCid[file.cid]?.trim() || undefined,
                    )
                  }
                  isLoading={retrievingCid === file.cid}
                  loadingText="1 PPT…"
                >
                  Retrieve · 1 PPT
                </Button>
                <Input
                  type="password"
                  placeholder="Password if encrypted"
                  value={pwdByCid[file.cid] ?? ''}
                  onChange={(e) =>
                    setPwdByCid((prev) => ({
                      ...prev,
                      [file.cid]: e.target.value,
                    }))
                  }
                  size="sm"
                  mt="0.75em"
                  className="upload-pwd-input"
                  bg="rgba(255,255,255,0.04)"
                  border="1px solid rgba(255,255,255,0.1)"
                  color="var(--text-inverse)"
                  _placeholder={{ color: 'var(--text-muted)' }}
                  _focus={{
                    borderColor: 'var(--primary-500)',
                    boxShadow: 'none',
                  }}
                  borderRadius="8px"
                />
                {(() => {
                  const preview = previewByCid[file.cid]
                  if (!preview) return null
                  return (
                    <Box mt="0.75em" className="upload-preview" w="100%">
                      <PreviewPane
                        url={preview.url}
                        type={preview.type}
                        name={file.filename}
                      />
                    </Box>
                  )
                })()}
              </Box>
            )
          })}
        </SimpleGrid>
      )}
    </VStack>
  )
}
