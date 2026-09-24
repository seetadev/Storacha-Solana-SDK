import { FileUpload } from '@/components/upload'
import { KuboNodeSelector } from '@/components/kubo-node-selector'
import { useNodeContext } from '@/hooks/context'
import { usePptPayment } from '@/hooks/use-ppt-payment'
import { getApiBase } from '@/lib/meshkit-guest'
import { PreviewPane } from '@/components/file-preview'
import { PUBLIC_IPFS_GATEWAYS, publicGatewayUrl } from '@/lib/ipfs-gateways'
import { waitForTxReceipt } from '@/lib/wait-tx'
import { formatFileSize } from '@/lib/utils'
import { PPT_CHAIN_ID, PPT_TOKEN_ADDRESS, PPT_TREASURY } from '@/config/ppt'
import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  LockKeyIcon,
  ShareNetworkIcon,
  UploadSimpleIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import { useWaitForTransactionReceipt } from 'wagmi'

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
  files: Array<UploadedFileResult>
  totalSize: number
  encrypted: boolean
  uploadedAt: string
  payment?: {
    token: string
    chain: string
    amount: string
    transactionHash: string
  }
}

const SECTION_LABEL_STYLE = {
  fontSize: '11px' as const,
  fontWeight: '600' as const,
  color: 'var(--text-muted)' as const,
  letterSpacing: '0.08em' as const,
  textTransform: 'uppercase' as const,
}

/**
 * MeshKit end-to-end upload UI with PPT token gate.
 * Pay 1 PPT on Arbitrum Sepolia → pin via meshkit → retrieve costs another 1 PPT.
 */
export const Upload = () => {
  const { activeNode } = useNodeContext()
  const apiBase = getApiBase()
  const ppt = usePptPayment()

  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([])
  const [encryptPassword, setEncryptPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [retrievingCid, setRetrievingCid] = useState<string | null>(null)
  const [retrievePassword, setRetrievePassword] = useState('')
  const [previewByCid, setPreviewByCid] = useState<
    Record<string, { url: string; type: string; name: string } | undefined>
  >({})
  const [result, setResult] = useState<UploadResult | null>(null)
  const [pendingPayHash, setPendingPayHash] = useState<
    `0x${string}` | undefined
  >()
  const [gatewayByCid, setGatewayByCid] = useState<Record<string, string>>({})

  const { isLoading: isConfirmingPay } = useWaitForTransactionReceipt({
    hash: pendingPayHash,
  })

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  const handleUpload = async () => {
    if (!selectedFiles.length) return
    if (!ppt.isConnected || !ppt.address) {
      ppt.connectWallet()
      toast.message('Connect MetaMask on Arbitrum Sepolia')
      return
    }
    if (!ppt.isOnPptChain) {
      try {
        await ppt.ensureChain()
      } catch {
        toast.error('Switch MetaMask to Arbitrum Sepolia')
        return
      }
    }

    setUploading(true)
    const toastId = toast.loading('Paying 1 PPT…')

    try {
      const txHash = await ppt.payOnePpt()
      setPendingPayHash(txHash)
      toast.loading('Waiting for PPT confirmation…', { id: toastId })
      await waitForTxReceipt(txHash)

      toast.loading('Uploading via MeshKit…', { id: toastId })

      const form = new FormData()
      selectedFiles.forEach((f) => form.append('file', f, f.name))
      form.append('userAddress', ppt.address.toLowerCase())
      form.append('transactionHash', txHash)
      if (encryptPassword.trim()) {
        form.append('encryptPassword', encryptPassword.trim())
      }

      let res: Response
      try {
        res = await fetch(`${apiBase}/upload/meshkit`, {
          method: 'POST',
          headers: {
            'X-Kubo-Node-URL': activeNode.apiUrl,
            'X-IPFS-Gateway-URL': activeNode.gatewayUrl,
          },
          body: form,
        })
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'network error'
        throw new Error(
          `Cannot reach the storage API at ${apiBase} (${detail})`,
        )
      }

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
      setPendingPayHash(undefined)
      toast.success(
        data.encrypted
          ? 'Paid 1 PPT · encrypted & pinned'
          : 'Paid 1 PPT · pinned via MeshKit',
        { id: toastId },
      )
    } catch (err) {
      setPendingPayHash(undefined)
      toast.error(err instanceof Error ? err.message : 'Upload failed', {
        id: toastId,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRetrieve = async (file: UploadedFileResult) => {
    if (!ppt.isConnected || !ppt.address) {
      ppt.connectWallet()
      toast.message('Connect MetaMask to pay 1 PPT for retrieve')
      return
    }

    setRetrievingCid(file.cid)
    const pwd = retrievePassword.trim() || encryptPassword.trim()
    if (result?.encrypted && !pwd) {
      toast.error('Enter the encryption password to retrieve this file')
      setRetrievingCid(null)
      return
    }
    const toastId = toast.loading('Paying 1 PPT for retrieve…')

    try {
      if (!ppt.isOnPptChain) await ppt.ensureChain()
      const txHash = await ppt.payOnePpt()
      setPendingPayHash(txHash)
      await waitForTxReceipt(txHash)

      toast.loading('Retrieving via MeshKit…', { id: toastId })

      const url = new URL(
        `${apiBase}/upload/retrieve/${encodeURIComponent(file.cid)}`,
      )
      if (pwd) {
        url.searchParams.set('password', pwd)
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
      const blobType = blob.type || file.type || 'application/octet-stream'
      setPendingPayHash(undefined)

      const viewable =
        blobType.startsWith('image/') ||
        blobType.startsWith('video/') ||
        blobType.startsWith('audio/') ||
        blobType === 'application/pdf' ||
        blobType.startsWith('text/')
      if (viewable) {
        const objectUrl = URL.createObjectURL(blob)
        setPreviewByCid((prev) => {
          const old = prev[file.cid]
          if (old) URL.revokeObjectURL(old.url)
          return {
            ...prev,
            [file.cid]: { url: objectUrl, type: blobType, name: file.name },
          }
        })
        toast.success(
          result?.encrypted
            ? 'Paid 1 PPT \u00b7 decrypted \u2014 preview below'
            : 'Paid 1 PPT \u00b7 retrieved \u2014 preview below',
          { id: toastId },
        )
      } else {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
        toast.success('Paid 1 PPT \u00b7 retrieved via MeshKit', {
          id: toastId,
        })
      }
    } catch (err) {
      setPendingPayHash(undefined)
      toast.error(err instanceof Error ? err.message : 'Retrieve failed', {
        id: toastId,
      })
    } finally {
      setRetrievingCid(null)
    }
  }

  const resetUpload = () => {
    setPreviewByCid((prev) => {
      Object.values(prev).forEach((entry) => {
        if (entry) URL.revokeObjectURL(entry.url)
      })
      return {}
    })
    setRetrievePassword('')
    setResult(null)
    setSelectedFiles([])
  }

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const gatewayUrlFor = (file: UploadedFileResult) =>
    publicGatewayUrl(
      file.cid,
      file.name,
      gatewayByCid[file.cid] ?? PUBLIC_IPFS_GATEWAYS[0].base,
    )

  const shareFileLink = async (file: UploadedFileResult) => {
    const shareData = {
      title: file.name,
      text: `IPFS: ${file.name}`,
      url: gatewayUrlFor(file),
    }
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (
          navigator as Navigator & {
            share: (d: typeof shareData) => Promise<void>
          }
        ).share(shareData)
      } catch {
        // user dismissed the share sheet - ignore
      }
    } else {
      await copyShareLink(gatewayUrlFor(file))
    }
  }

  const walletBar = (
    <HStack
      justify="space-between"
      p="0.85em 1em"
      bg="rgba(255,255,255,0.03)"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="10px"
    >
      <VStack align="start" spacing="0.15em">
        <Text {...SECTION_LABEL_STYLE}>PPT payment · Arbitrum Sepolia</Text>
        <Text fontSize="12px" color="var(--text-muted)">
          {ppt.isConnected && ppt.address
            ? `${truncate(ppt.address)} · ${ppt.isOnPptChain ? 'chain OK' : `switch to ${PPT_CHAIN_ID}`}`
            : 'Connect MetaMask to pay 1 PPT per op'}
        </Text>
      </VStack>
      {!ppt.isConnected ? (
        <Button
          size="sm"
          leftIcon={<WalletIcon size={16} />}
          onClick={ppt.connectWallet}
          isLoading={ppt.isConnecting}
          bg="var(--primary-500)"
          color="white"
          borderRadius="8px"
          _hover={{ bg: 'var(--primary-600)' }}
        >
          Connect
        </Button>
      ) : !ppt.isOnPptChain ? (
        <Button
          size="sm"
          onClick={() => ppt.ensureChain()}
          isLoading={ppt.isSwitching}
          variant="outline"
          borderColor="rgba(249,115,22,0.4)"
          color="var(--primary-500)"
          borderRadius="8px"
        >
          Switch chain
        </Button>
      ) : (
        <Text fontSize="12px" color="#22c55e" fontWeight="600">
          1 PPT / op
        </Text>
      )}
    </HStack>
  )

  if (result) {
    return (
      <VStack spacing="1.5em" align="stretch" className="upload-page">
        {walletBar}
        <HStack spacing="0.75em" className="upload-success-banner">
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
              {formatFileSize(result.totalSize)} · via {activeNode.label} · 1
              PPT
            </Text>
          </VStack>
        </HStack>

        {result.payment?.transactionHash && (
          <Box
            p="1em"
            bg="rgba(255,255,255,0.03)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="12px"
          >
            <Text {...SECTION_LABEL_STYLE} mb="0.5em">
              Payment
            </Text>
            <Text fontSize="13px" color="var(--text-muted)">
              1 PPT ·{' '}
              <Text as="span" fontFamily="mono" color="var(--text-inverse)">
                {truncate(result.payment.transactionHash)}
              </Text>{' '}
              <Box
                as="a"
                href={`https://sepolia.arbiscan.io/tx/${result.payment.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                color="var(--primary-500)"
                display="inline"
              >
                <ArrowSquareOutIcon size={12} style={{ display: 'inline' }} />
              </Box>
            </Text>
          </Box>
        )}

        <Box>
          <Text {...SECTION_LABEL_STYLE} mb="0.5em">
            Files — retrieve costs 1 PPT each
          </Text>
          {result.encrypted && (
            <Box>
              <Text {...SECTION_LABEL_STYLE} mb="0.5em">
                Retrieve password
              </Text>
              <Input
                type="password"
                className="upload-pwd-input"
                placeholder="Password used at upload time"
                value={retrievePassword}
                onChange={(e) => setRetrievePassword(e.target.value)}
                size="sm"
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
              <Text fontSize="11px" color="var(--text-muted)" mt="0.4em">
                Required to decrypt. Same password you encrypted with.
              </Text>
            </Box>
          )}
          <VStack spacing="0.5em" align="stretch">
            {result.files.map((file) => (
              <Fragment key={file.cid}>
                <HStack
                  key={file.cid}
                  className="upload-file-card"
                  p="0.75em 1em"
                  bg="rgba(255,255,255,0.03)"
                  border="1px solid rgba(255,255,255,0.08)"
                  borderRadius="10px"
                  justify="space-between"
                >
                  <VStack align="start" spacing="0" flex="1" minW="0">
                    <Text fontSize="13px" color="var(--text-inverse)">
                      {file.name}
                    </Text>
                    <Text fontSize="11px" color="var(--text-muted)">
                      {formatFileSize(file.size)}
                    </Text>
                    <HStack
                      spacing="0.4em"
                      mt="0.35em"
                      maxW="100%"
                      className="upload-share-row"
                    >
                      <Box
                        as="a"
                        href={gatewayUrlFor(file)}
                        target="_blank"
                        rel="noreferrer"
                        color="var(--primary-500)"
                        fontSize="11px"
                        className="upload-share-link"
                        fontFamily="mono"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="260px"
                        title={gatewayUrlFor(file)}
                      >
                        {gatewayUrlFor(file)}
                      </Box>
                      <Button
                        size="xs"
                        variant="ghost"
                        leftIcon={<CopyIcon size={12} />}
                        onClick={() => copyShareLink(gatewayUrlFor(file))}
                        color="var(--text-muted)"
                        _hover={{ color: 'var(--text-inverse)' }}
                        px="0.4em"
                      >
                        Copy
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        leftIcon={<ShareNetworkIcon size={12} />}
                        onClick={() => shareFileLink(file)}
                        color="var(--text-muted)"
                        _hover={{ color: 'var(--text-inverse)' }}
                        px="0.4em"
                      >
                        Share
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        as="a"
                        href={gatewayUrlFor(file)}
                        target="_blank"
                        rel="noreferrer"
                        leftIcon={<ArrowSquareOutIcon size={12} />}
                        color="var(--text-muted)"
                        _hover={{ color: 'var(--text-inverse)' }}
                        px="0.4em"
                      >
                        View
                      </Button>
                    </HStack>
                    <HStack
                      spacing="0.3em"
                      mt="0.1em"
                      className="gateway-pills"
                    >
                      <Text fontSize="10px" color="var(--text-muted)">
                        View via:
                      </Text>
                      {PUBLIC_IPFS_GATEWAYS.map((g) => {
                        const isActive =
                          (gatewayByCid[file.cid] ??
                            PUBLIC_IPFS_GATEWAYS[0].base) === g.base
                        return (
                          <Button
                            key={g.id}
                            size="xs"
                            variant="ghost"
                            className={isActive ? 'pill pill-active' : 'pill'}
                            onClick={() =>
                              setGatewayByCid((prev) => ({
                                ...prev,
                                [file.cid]: g.base,
                              }))
                            }
                            fontSize="10px"
                            px="0.4em"
                            minW="auto"
                            h="1.4em"
                          >
                            {g.label}
                          </Button>
                        )
                      })}
                    </HStack>
                  </VStack>
                  <Button
                    size="sm"
                    leftIcon={<DownloadSimpleIcon size={16} />}
                    onClick={() => handleRetrieve(file)}
                    isLoading={retrievingCid === file.cid}
                    loadingText="Paying…"
                    bg="rgba(249,115,22,0.15)"
                    color="var(--primary-500)"
                    borderRadius="8px"
                    _hover={{ bg: 'rgba(249,115,22,0.25)' }}
                  >
                    Retrieve · 1 PPT
                  </Button>
                </HStack>
                {(() => {
                  const preview = previewByCid[file.cid]
                  if (!preview) return null
                  return (
                    <Box
                      w="100%"
                      p="0.5em"
                      className="upload-preview"
                      bg="rgba(0,0,0,0.3)"
                      border="1px solid rgba(255,255,255,0.08)"
                      borderRadius="8px"
                    >
                      <PreviewPane
                        url={preview.url}
                        type={preview.type}
                        name={file.name}
                      />
                    </Box>
                  )
                })()}
              </Fragment>
            ))}
          </VStack>
        </Box>

        <Button
          variant="ghost"
          onClick={resetUpload}
          alignSelf="flex-start"
          color="var(--text-muted)"
        >
          Upload another file
        </Button>
      </VStack>
    )
  }

  return (
    <VStack spacing="1.5em" align="stretch" className="upload-page">
      <HStack spacing="0.75em" className="upload-hero">
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
            1 PPT on Arbitrum Sepolia · pin via MeshKit
          </Text>
        </VStack>
      </HStack>

      {walletBar}

      <Box className="upload-section">
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          IPFS Node
        </Text>
        <KuboNodeSelector apiBase={apiBase} />
      </Box>

      <Box className="upload-section">
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Files
        </Text>
        <FileUpload onFilesSelected={setSelectedFiles} />
      </Box>

      <Box className="upload-section">
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Encryption (optional)
        </Text>
        <Input
          type="password"
          className="upload-pwd-input"
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
        isLoading={uploading || isConfirmingPay}
        loadingText={
          pendingPayHash ? 'Confirming PPT…' : 'Paying 1 PPT & pinning…'
        }
        isDisabled={!selectedFiles.length || uploading || ppt.isPaying}
        className="upload-cta"
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
        {!ppt.isConnected
          ? 'Connect wallet to upload'
          : !selectedFiles.length
            ? 'Select files to upload'
            : encryptPassword.trim()
              ? `Pay 1 PPT · encrypt & pin ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
              : `Pay 1 PPT · pin ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
      </Button>

      <HStack
        spacing="0.6em"
        p="0.8em 1em"
        bg="rgba(249,115,22,0.06)"
        border="1px solid rgba(249,115,22,0.15)"
        borderRadius="10px"
      >
        <Text fontSize="12px" color="var(--text-muted)" lineHeight="1.5">
          Token{' '}
          <Text as="span" color="var(--text-inverse)" fontFamily="mono">
            {truncate(PPT_TOKEN_ADDRESS)}
          </Text>{' '}
          → treasury{' '}
          <Text as="span" color="var(--text-inverse)" fontFamily="mono">
            {truncate(PPT_TREASURY)}
          </Text>
          . Each upload and each retrieve costs exactly 1 PPT.
        </Text>
      </HStack>
    </VStack>
  )
}
