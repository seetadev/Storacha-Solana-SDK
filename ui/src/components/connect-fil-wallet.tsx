import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useConnect } from 'wagmi'
import { ModalLayout } from '../layouts/modal-layout/modal'

interface FilWalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ConnectFilWallet = ({
  isOpen,
  onClose,
}: FilWalletConnectModalProps) => {
  const { connectors, connect } = useConnect()

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId)
    if (connector) {
      connect({ connector })
      onClose()
    }
  }

  return (
    <ModalLayout
      title="Connect Wallet"
      subTitle="Select your preferred Filecoin wallet"
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      px="1em"
      radius="1em"
    >
      <VStack spacing=".8em" align="stretch" mt="-1em">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            onClick={() => handleConnect(connector.id)}
            height="60px"
            justifyContent="start"
            background="var(--heavy-grey)"
            borderRadius="10px"
            _hover={{
              bg: 'var(--alt-grey)',
            }}
            border="1px solid rgba(255,255,255,0.05)"
          >
            <HStack>
              {connector.icon && (
                <Box
                  as="img"
                  src={connector.icon}
                  alt={connector.name}
                  w="32px"
                  h="32px"
                />
              )}
              <Text
                color="var(--text-inverse)"
                fontWeight="400"
                fontSize="14px"
              >
                {connector.name}
              </Text>
            </HStack>
          </Button>
        ))}
      </VStack>
    </ModalLayout>
  )
}
