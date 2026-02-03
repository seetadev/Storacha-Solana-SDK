import { Button, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import {
  CheckCircleIcon,
  InfoIcon,
  WifiHighIcon,
  WifiSlashIcon,
} from '@phosphor-icons/react'
import type { ModalLayoutProps } from './modal'
import { ModalLayout } from './modal'

type ConnectionStatus = 'checking' | 'good' | 'slow' | 'offline' | 'unknown'

interface ConnectionWarningProps
  extends Pick<ModalLayoutProps, 'isOpen' | 'onClose'> {
  onProceed: () => void
  connectionStatus: ConnectionStatus
  latency: number | null
}

export const ConnectionWarning = ({
  isOpen,
  onClose,
  onProceed,
  connectionStatus,
  latency,
}: ConnectionWarningProps) => {
  const isSlowOrOffline =
    connectionStatus === 'slow' || connectionStatus === 'offline'
  const isChecking =
    connectionStatus === 'checking' || connectionStatus === 'unknown'

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      borderRadius="12px"
      title="Before you upload"
      px=".8em"
    >
      <Stack spacing="1.25em" mt="-1em">
        <HStack
          p="1em"
          bg={
            isChecking
              ? 'rgba(59, 130, 246, 0.08)'
              : isSlowOrOffline
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(16, 185, 129, 0.08)'
          }
          border={`1px solid ${
            isChecking
              ? 'rgba(59, 130, 246, 0.2)'
              : isSlowOrOffline
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(16, 185, 129, 0.2)'
          }`}
          borderRadius="var(--radius-md)"
          spacing=".75em"
        >
          {isChecking ? (
            <WifiHighIcon size={24} color="var(--info)" weight="duotone" />
          ) : isSlowOrOffline ? (
            <WifiSlashIcon size={24} color="var(--error)" weight="duotone" />
          ) : (
            <CheckCircleIcon
              size={24}
              color="var(--success)"
              weight="duotone"
            />
          )}
          <VStack align="start" spacing="0">
            <Text
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              color={
                isChecking
                  ? 'var(--info)'
                  : isSlowOrOffline
                    ? 'var(--error)'
                    : 'var(--success)'
              }
            >
              {isChecking
                ? 'Checking connection...'
                : connectionStatus === 'offline'
                  ? 'Connection issue detected'
                  : connectionStatus === 'slow'
                    ? 'Slow connection detected'
                    : 'Connection looks good'}
            </Text>
            {latency && !isChecking && (
              <Text fontSize="var(--font-size-xs)" color="var(--text-tertiary)">
                Response time: {(latency / 1000).toFixed(1)}s
              </Text>
            )}
          </VStack>
        </HStack>

        <VStack
          align="start"
          spacing="0.75em"
          p="1em"
          bg="var(--bg-dark)"
          borderRadius="var(--radius-md)"
        >
          <HStack spacing="0.5em">
            <InfoIcon size={16} color="var(--warning)" weight="fill" />
            <Text
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              color="var(--warning)"
            >
              Important
            </Text>
          </HStack>
          <Text
            fontSize="var(--font-size-sm)"
            color="var(--text-muted)"
            lineHeight="1.6"
          >
            Uploading files requires a stable internet connection. If your
            connection drops during the upload, your payment may go through but
            your files might not be stored.
          </Text>
          {isSlowOrOffline && (
            <Text
              fontSize="var(--font-size-sm)"
              color="var(--error)"
              lineHeight="1.6"
            >
              Your connection appears unstable. We strongly recommend waiting
              for a better connection before uploading. Especially if you're
              uploading large files
            </Text>
          )}
        </VStack>

        <HStack spacing="0.75em">
          <Button
            onClick={onClose}
            flex="1"
            size="md"
            fontWeight="400"
            variant="outline"
            borderColor="var(--border-hover)"
            color="var(--text-muted)"
            _hover={{
              bg: 'var(--bg-dark)',
              borderColor: 'var(--border-hover)',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onProceed}
            flex="1"
            size="md"
            fontWeight="400"
            bg={isSlowOrOffline ? 'var(--warning)' : 'var(--text-inverse)'}
            color={isSlowOrOffline ? 'white' : 'var(--bg-darker)'}
            isDisabled={isChecking}
            _hover={{
              bg: isSlowOrOffline ? 'var(--warning)' : 'var(--text-inverse)',
              opacity: 0.9,
            }}
          >
            {isSlowOrOffline ? 'Upload Anyway' : 'Continue'}
          </Button>
        </HStack>
      </Stack>
    </ModalLayout>
  )
}
