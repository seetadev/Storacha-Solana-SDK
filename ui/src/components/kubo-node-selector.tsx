import { useIpfsNodeHealth } from '@/hooks/ipfs-node-health'
import { useNodeContext } from '@/hooks/context'
import type { KuboNodeConfig } from '@/lib/types'
import {
  Box,
  Button,
  Collapse,
  Divider,
  HStack,
  IconButton,
  Input,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import {
  CheckCircleIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  WifiHighIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

interface NodeRowProps {
  node: KuboNodeConfig
  isActive: boolean
  apiBase: string
  onSelect: (node: KuboNodeConfig) => void
  onRemove: (id: string) => void
}

const NodeRow = ({
  node,
  isActive,
  apiBase,
  onSelect,
  onRemove,
}: NodeRowProps) => {
  const { isHealthy, isChecking, error, health, recheck } = useIpfsNodeHealth(
    apiBase,
    node.apiUrl,
  )

  const statusColor = isChecking
    ? 'var(--text-muted)'
    : isHealthy
      ? '#22c55e'
      : '#ef4444'

  const StatusIcon = isChecking
    ? WifiHighIcon
    : isHealthy
      ? CheckCircleIcon
      : XCircleIcon

  return (
    <HStack
      spacing="0.75em"
      p="0.75em 1em"
      borderRadius="10px"
      bg={isActive ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)'}
      border={`1px solid ${isActive ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)'}`}
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ bg: isActive ? undefined : 'rgba(255,255,255,0.04)' }}
      onClick={() => onSelect(node)}
    >
      <Tooltip
        label={
          isChecking
            ? 'Checking…'
            : isHealthy
              ? `Online · ${health?.latencyMs}ms · ${health?.pinCount} pins`
              : (error ?? 'Unreachable')
        }
        placement="top"
        hasArrow
      >
        <Box
          display="flex"
          alignItems="center"
          onClick={(e) => {
            e.stopPropagation()
            recheck()
          }}
        >
          <StatusIcon
            size={16}
            color={statusColor}
            weight={isChecking ? 'regular' : 'fill'}
          />
        </Box>
      </Tooltip>

      <VStack align="start" spacing="0" flex={1} minW={0}>
        <Text
          fontSize="13px"
          fontWeight="500"
          color={isActive ? 'var(--primary-500)' : 'var(--text-inverse)'}
          noOfLines={1}
        >
          {node.label}
        </Text>
        <Text fontSize="11px" color="var(--text-muted)" noOfLines={1}>
          {node.apiUrl}
        </Text>
      </VStack>

      {isActive && (
        <Text
          fontSize="10px"
          color="var(--primary-500)"
          fontWeight="600"
          letterSpacing="0.05em"
        >
          ACTIVE
        </Text>
      )}

      {node.id !== 'local-default' && (
        <IconButton
          aria-label="Remove node"
          icon={<TrashIcon size={14} />}
          size="xs"
          variant="ghost"
          color="var(--text-muted)"
          _hover={{ color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(node.id)
          }}
        />
      )}
    </HStack>
  )
}

interface AddNodeFormProps {
  onAdd: (node: Omit<KuboNodeConfig, 'id'>) => void
  onCancel: () => void
}

const AddNodeForm = ({ onAdd, onCancel }: AddNodeFormProps) => {
  const [label, setLabel] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState('')

  // Auto-derive gateway URL from API URL when gateway is empty
  const derivedGateway = apiUrl.replace(':5001', ':8080')

  const handleSubmit = () => {
    if (!label.trim() || !apiUrl.trim()) return
    onAdd({
      label: label.trim(),
      apiUrl: apiUrl.trim(),
      gatewayUrl: (gatewayUrl.trim() || derivedGateway).trim(),
    })
    setLabel('')
    setApiUrl('')
    setGatewayUrl('')
  }

  return (
    <VStack spacing="0.6em" align="stretch">
      <Input
        placeholder="Label (e.g. Akamai Node)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        size="sm"
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.1)"
        color="var(--text-inverse)"
        _placeholder={{ color: 'var(--text-muted)' }}
        _focus={{ borderColor: 'var(--primary-500)', boxShadow: 'none' }}
        borderRadius="8px"
      />
      <Input
        placeholder="Kubo API URL (e.g. http://kubo.aws.example.com:5001)"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        size="sm"
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.1)"
        color="var(--text-inverse)"
        _placeholder={{ color: 'var(--text-muted)' }}
        _focus={{ borderColor: 'var(--primary-500)', boxShadow: 'none' }}
        borderRadius="8px"
        fontFamily="mono"
      />
      <Input
        placeholder={
          derivedGateway || 'Gateway URL (auto-derived from API URL)'
        }
        value={gatewayUrl}
        onChange={(e) => setGatewayUrl(e.target.value)}
        size="sm"
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.1)"
        color="var(--text-inverse)"
        _placeholder={{ color: 'var(--text-muted)' }}
        _focus={{ borderColor: 'var(--primary-500)', boxShadow: 'none' }}
        borderRadius="8px"
        fontFamily="mono"
      />
      <HStack spacing="0.5em" justify="flex-end">
        <Button
          size="xs"
          variant="ghost"
          color="var(--text-muted)"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="xs"
          bg="var(--primary-500)"
          color="white"
          _hover={{ bg: 'var(--primary-600)' }}
          onClick={handleSubmit}
          isDisabled={!label.trim() || !apiUrl.trim()}
        >
          Add Node
        </Button>
      </HStack>
    </VStack>
  )
}

interface KuboNodeSelectorProps {
  /** Backend API base URL for health checks. */
  apiBase: string
}

/**
 * Kubo node selector.
 *
 * In compact mode (default for the upload form) it renders as a small pill
 * showing the active node name and status.  Clicking expands a panel to add,
 * select, or remove nodes.
 */
export const KuboNodeSelector = ({ apiBase }: KuboNodeSelectorProps) => {
  const { nodes, activeNode, setActiveNode, addNode, removeNode } =
    useNodeContext()
  const [expanded, setExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const { isHealthy, isChecking } = useIpfsNodeHealth(
    apiBase,
    activeNode.apiUrl,
  )

  const statusColor = isChecking ? '#f59e0b' : isHealthy ? '#22c55e' : '#ef4444'

  return (
    <Box>
      {/* Pill / trigger */}
      <HStack
        spacing="0.5em"
        display="inline-flex"
        px="0.75em"
        py="0.35em"
        bg="rgba(255,255,255,0.05)"
        border="1px solid rgba(255,255,255,0.1)"
        borderRadius="full"
        cursor="pointer"
        _hover={{ borderColor: 'rgba(255,255,255,0.2)' }}
        transition="all 0.15s"
        onClick={() => setExpanded((v) => !v)}
        userSelect="none"
      >
        {/* Status dot */}
        <Box
          w="7px"
          h="7px"
          borderRadius="full"
          bg={statusColor}
          flexShrink={0}
          transition="background 0.3s"
          boxShadow={isHealthy ? `0 0 6px ${statusColor}` : undefined}
        />
        <Text fontSize="12px" fontWeight="500" color="var(--text-inverse)">
          {activeNode.label}
        </Text>
        <PencilSimpleIcon size={12} color="var(--text-muted)" />
      </HStack>

      {/* Expanded panel */}
      <Collapse in={expanded} animateOpacity>
        <Box
          mt="0.5em"
          p="1em"
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="12px"
        >
          <Text
            fontSize="11px"
            fontWeight="600"
            color="var(--text-muted)"
            letterSpacing="0.08em"
            mb="0.75em"
          >
            IPFS NODES
          </Text>

          <VStack spacing="0.4em" align="stretch">
            {nodes.map((node) => (
              <NodeRow
                key={node.id}
                node={node}
                isActive={node.id === activeNode.id}
                apiBase={apiBase}
                onSelect={(n) => {
                  setActiveNode(n)
                  if (!showAddForm) setExpanded(false)
                }}
                onRemove={removeNode}
              />
            ))}
          </VStack>

          <Divider borderColor="rgba(255,255,255,0.06)" my="0.75em" />

          {showAddForm ? (
            <AddNodeForm
              onAdd={(node) => {
                const added = addNode(node)
                setActiveNode(added)
                setShowAddForm(false)
                setExpanded(false)
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Button
              size="xs"
              variant="ghost"
              color="var(--text-muted)"
              leftIcon={<PlusIcon size={12} />}
              _hover={{
                color: 'var(--text-inverse)',
                bg: 'rgba(255,255,255,0.05)',
              }}
              onClick={() => setShowAddForm(true)}
              w="full"
            >
              Add remote node
            </Button>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
