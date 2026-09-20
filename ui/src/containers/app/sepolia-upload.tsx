import { FileUpload } from '@/components/upload'
import { KuboNodeSelector } from '@/components/kubo-node-selector'
import { useNodeContext } from '@/hooks/context'
import { formatFileSize } from '@/lib/utils'
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CopyIcon,
  DiamondIcon,
  LinkSimpleIcon,
  UploadSimpleIcon,
  WalletIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { sepolia } from 'wagmi/chains'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'

interface UploadResult {
  cid: string
  url: string
  files: Array<{ name: string; size: number; type: string; url: string }>
  totalSize: number
  uploadedAt: string
}

const SECTION_LABEL_STYLE = {
  fontSize: '11px' as const,
  fontWeight: '600' as const,
  color: 'var(--text-muted)' as const,
  letterSpacing: '0.08em' as const,
  textTransform: 'uppercase' as const,
}

export const SepoliaUpload = () => {
  const { activeNode } = useNodeContext()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [copiedCid, setCopiedCid] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const configuredNetwork =
    import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta'
  const apiBase =
    import.meta.env.VITE_API_URL ||
    (configuredNetwork === 'mainnet-beta'
      ? 'https://api.toju.network'
      : 'http://localhost:3000')

  const isOnSepolia = chain?.id === sepolia.id
  const needsChainSwitch = isConnected && !isOnSepolia

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  const copyToClipboard = async (
    text: string,
    setCopied: (v: boolean) => void,
  ) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = () => {
    const injector = connectors.find((c) => c.id === 'injected')
    if (injector) connect({ connector: injector, chainId: sepolia.id })
  }

  const handleUpload = async () => {
    if (!selectedFiles.length || !address) return
    if (!isOnSepolia) {
      switchChain({ chainId: sepolia.id })
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      selectedFiles.forEach((f) => form.append('file', f, f.name))
      form.append('userAddress', address)

      const res = await fetch(`${apiBase}/upload/sepolia`, {
        method: 'POST',
        headers: {
          'X-Kubo-Node-URL': activeNode.apiUrl,
          'X-IPFS-Gateway-URL': activeNode.gatewayUrl,
        },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error((err as { message: string }).message)
      }

      const data = (await res.json()) as UploadResult
      setResult(data)
      setSelectedFiles([])
      toast.success('Files pinned to IPFS')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setResult(null)
    setSelectedFiles([])
  }

  // ─── Success view ───────────────────────────────────────────────────────────
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
              Pinned to IPFS
            </Text>
            <Text fontSize="13px" color="var(--text-muted)">
              {result.files.length} file{result.files.length !== 1 ? 's' : ''} ·{' '}
              {formatFileSize(result.totalSize)} · via {activeNode.label}
            </Text>
          </VStack>
        </HStack>

        {/* CID */}
        <Box
          p="1em"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="12px"
        >
          <Text {...SECTION_LABEL_STYLE} mb="0.5em">
            Content ID (CID)
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
            <IconButton
              text={copiedCid ? 'Copied!' : 'Copy CID'}
              icon={<CopyIcon size={14} />}
              onClick={() => copyToClipboard(result.cid, setCopiedCid)}
              isSuccess={copiedCid}
            />
          </HStack>
        </Box>

        {/* Gateway URL */}
        <Box
          p="1em"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="12px"
        >
          <Text {...SECTION_LABEL_STYLE} mb="0.5em">
            Gateway URL
          </Text>
          <HStack spacing="0.5em">
            <Text
              fontSize="13px"
              color="var(--primary-500)"
              fontFamily="mono"
              flex={1}
              noOfLines={1}
            >
              {result.url}
            </Text>
            <HStack spacing="0.4em">
              <IconButton
                text={copiedUrl ? 'Copied!' : 'Copy URL'}
                icon={<CopyIcon size={14} />}
                onClick={() => copyToClipboard(result.url, setCopiedUrl)}
                isSuccess={copiedUrl}
              />
              <IconButton
                text="Open in browser"
                icon={<ArrowSquareOutIcon size={14} />}
                onClick={() => window.open(result.url, '_blank')}
              />
            </HStack>
          </HStack>
        </Box>

        {/* Files list */}
        {result.files.length > 1 && (
          <Box
            p="1em"
            bg="rgba(255,255,255,0.03)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="12px"
          >
            <Text {...SECTION_LABEL_STYLE} mb="0.75em">
              Files ({result.files.length})
            </Text>
            <VStack spacing="0.4em" align="stretch">
              {result.files.map((f) => (
                <HStack key={f.name} spacing="0.75em" py="0.3em">
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg="var(--primary-500)"
                    flexShrink={0}
                  />
                  <Text
                    fontSize="13px"
                    color="var(--text-inverse)"
                    flex={1}
                    noOfLines={1}
                  >
                    {f.name}
                  </Text>
                  <Text
                    fontSize="12px"
                    color="var(--text-muted)"
                    flexShrink={0}
                  >
                    {formatFileSize(f.size)}
                  </Text>
                  <Box
                    as="a"
                    href={f.url}
                    target="_blank"
                    color="var(--text-muted)"
                    _hover={{ color: 'var(--primary-500)' }}
                    transition="color 0.15s"
                    display="flex"
                    alignItems="center"
                  >
                    <ArrowSquareOutIcon size={14} />
                  </Box>
                </HStack>
              ))}
            </VStack>
          </Box>
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

  // ─── Upload form ────────────────────────────────────────────────────────────
  return (
    <VStack spacing="1.5em" align="stretch">
      {/* Page header */}
      <HStack spacing="0.75em">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="40px"
          h="40px"
          borderRadius="12px"
          bg="rgba(100,116,255,0.12)"
          border="1px solid rgba(100,116,255,0.3)"
          flexShrink={0}
        >
          <DiamondIcon size={22} color="#6474ff" weight="fill" />
        </Box>
        <VStack align="start" spacing="0">
          <Text fontSize="16px" fontWeight="600" color="var(--text-inverse)">
            Upload to IPFS
          </Text>
          <Text fontSize="13px" color="var(--text-muted)">
            Sepolia · files are pinned to your Kubo node
          </Text>
        </VStack>
      </HStack>

      {/* IPFS node selector */}
      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          IPFS Node
        </Text>
        <KuboNodeSelector apiBase={apiBase} />
      </Box>

      {/* File picker */}
      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Files
        </Text>
        <FileUpload onFilesSelected={setSelectedFiles} />
      </Box>

      {/* Wallet connection */}
      <Box>
        <Text {...SECTION_LABEL_STYLE} mb="0.5em">
          Sepolia Wallet
        </Text>

        {!isConnected ? (
          <Button
            onClick={handleConnect}
            height="44px"
            px="1.5em"
            bg="rgba(100,116,255,0.1)"
            border="1px solid rgba(100,116,255,0.3)"
            color="#6474ff"
            borderRadius="10px"
            fontWeight="500"
            fontSize="14px"
            leftIcon={<WalletIcon size={18} weight="fill" />}
            _hover={{
              bg: 'rgba(100,116,255,0.18)',
              borderColor: 'rgba(100,116,255,0.5)',
            }}
            transition="all 0.15s"
          >
            Connect MetaMask
          </Button>
        ) : (
          <HStack
            spacing="1em"
            px="1em"
            py="0.6em"
            bg="rgba(255,255,255,0.03)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="10px"
            display="inline-flex"
          >
            <HStack spacing="0.5em">
              <Box w="8px" h="8px" borderRadius="full" bg="#22c55e" />
              <Text
                fontSize="13px"
                color="var(--text-inverse)"
                fontFamily="mono"
              >
                {truncate(address!)}
              </Text>
            </HStack>

            {needsChainSwitch && (
              <HStack spacing="0.4em">
                <WarningCircleIcon size={14} color="#f59e0b" />
                <Text fontSize="12px" color="#f59e0b">
                  Wrong network
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  color="#f59e0b"
                  _hover={{ bg: 'rgba(245,158,11,0.1)' }}
                  onClick={() => switchChain({ chainId: sepolia.id })}
                >
                  Switch to Sepolia
                </Button>
              </HStack>
            )}

            <Button
              size="xs"
              variant="ghost"
              color="var(--text-muted)"
              _hover={{ color: '#ef4444', bg: 'rgba(239,68,68,0.08)' }}
              onClick={() => disconnect()}
            >
              Disconnect
            </Button>
          </HStack>
        )}
      </Box>

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        isLoading={uploading}
        loadingText="Pinning…"
        isDisabled={
          !selectedFiles.length || !isConnected || !isOnSepolia || uploading
        }
        height="48px"
        bg="var(--primary-500)"
        color="white"
        borderRadius="12px"
        fontWeight="600"
        fontSize="15px"
        leftIcon={<UploadSimpleIcon size={20} weight="bold" />}
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
        {!isConnected
          ? 'Connect wallet to upload'
          : needsChainSwitch
            ? 'Switch to Sepolia'
            : !selectedFiles.length
              ? 'Select files to upload'
              : `Pin ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} to IPFS`}
      </Button>

      {/* Info note */}
      <HStack
        spacing="0.6em"
        p="0.8em 1em"
        bg="rgba(100,116,255,0.06)"
        border="1px solid rgba(100,116,255,0.15)"
        borderRadius="10px"
      >
        <LinkSimpleIcon size={16} color="#6474ff" style={{ flexShrink: 0 }} />
        <Text fontSize="12px" color="var(--text-muted)" lineHeight="1.5">
          Files are pinned to IPFS using the selected Kubo node. On-chain
          payment verification for Sepolia will be added in a future release.
        </Text>
      </HStack>
    </VStack>
  )
}

// ─── Small reusable icon button ──────────────────────────────────────────────

interface IconButtonProps {
  text: string
  icon: React.ReactNode
  onClick: () => void
  isSuccess?: boolean
}

function IconButton({ text, icon, onClick, isSuccess }: IconButtonProps) {
  return (
    <Box
      as="button"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      borderRadius="7px"
      bg={isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)'}
      border={`1px solid ${isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`}
      color={isSuccess ? '#22c55e' : 'var(--text-muted)'}
      cursor="pointer"
      title={text}
      onClick={onClick}
      transition="all 0.15s"
      _hover={{
        bg: 'rgba(255,255,255,0.1)',
        color: 'var(--text-inverse)',
        borderColor: 'rgba(255,255,255,0.2)',
      }}
      flexShrink={0}
    >
      {icon}
    </Box>
  )
}
