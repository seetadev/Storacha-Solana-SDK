import { Box, IconButton, Text } from '@chakra-ui/react'
import { ListIcon } from '@phosphor-icons/react'
import { useNodeContext } from '@/hooks/context'
import { useIpfsNodeHealth } from '@/hooks/ipfs-node-health'
import { getApiBase } from '@/lib/meshkit-guest'

interface HeaderProps {
  onMenuOpen: () => void
}

/** MeshKit-only header — node status instead of wallet / payment chain. */
export const Header = ({ onMenuOpen }: HeaderProps) => {
  const { activeNode } = useNodeContext()
  const apiBase = getApiBase()
  const { isHealthy, isChecking, health } = useIpfsNodeHealth(
    apiBase,
    activeNode.apiUrl,
  )

  const statusColor = isChecking ? '#f59e0b' : isHealthy ? '#22c55e' : '#ef4444'
  const statusLabel = isChecking
    ? 'Checking node…'
    : isHealthy
      ? `Online · ${health?.latencyMs ?? '—'}ms`
      : 'Node unreachable'

  return (
    <Box
      height="70px"
      px={{ xl: '2em', md: '1.5em', lg: '1.5em', base: '.6em' }}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      position="fixed"
      width={{ xl: '85%', lg: '80%', md: '100%', base: '100%' }}
      background="rgba(8, 8, 8, 0.6)"
      backdropFilter="blur(12px)"
      zIndex="10"
      borderBottom="1px solid rgba(255,255,255,0.05)"
    >
      <Box display={{ base: 'block', md: 'block', lg: 'none' }}>
        <IconButton
          aria-label="Open menu"
          icon={<ListIcon size={24} weight="regular" />}
          variant="ghost"
          color="var(--text-muted)"
          _hover={{
            bg: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-inverse)',
          }}
          onClick={onMenuOpen}
        />
      </Box>

      <Box ml="auto">
        <Box
          display="inline-flex"
          alignItems="center"
          gap="0.6em"
          height="40px"
          px="1em"
          bg="rgba(255,255,255,0.05)"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="full"
        >
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={statusColor}
            boxShadow={isHealthy ? `0 0 6px ${statusColor}` : undefined}
          />
          <Text
            color="var(--text-inverse)"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
          >
            {activeNode.label}
          </Text>
          <Text color="var(--text-muted)" fontSize="11px">
            {statusLabel}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
