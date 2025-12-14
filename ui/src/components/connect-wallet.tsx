import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import type { WalletName } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import React from 'react'
import { ModalLayout } from '../layouts/modal-layout/modal'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ConnectWallet = ({ isOpen, onClose }: WalletConnectModalProps) => {
  const { wallets, select, connected } = useWallet()

  const selectWallet = (walletName: WalletName) => {
    select(walletName)
    onClose()
  }

  React.useEffect(() => {
    if (connected) {
      onClose()
    }
  }, [connected, onClose])

  const installedWallets = wallets.filter(
    (wallet) => wallet.readyState === 'Installed',
  )

  return (
    <ModalLayout
      title="Connect Wallet"
      subTitle="Select your preferred Solana wallet"
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      px="1em"
      radius="1em"
    >
      <VStack spacing=".8em" align="stretch" mt="-1em">
        {installedWallets.length > 0 ? (
          installedWallets.map((wallet) => (
            <Button
              key={wallet.adapter.name}
              onClick={() => selectWallet(wallet.adapter.name)}
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
                <Box
                  as="img"
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  w="32px"
                  h="32px"
                />
                <Text
                  color="var(--text-inverse)"
                  fontWeight="400"
                  fontSize="14px"
                >
                  {wallet.adapter.name}
                </Text>
              </HStack>
            </Button>
          ))
        ) : (
          <Text color="var(--text-muted)">
            No wallets found. Please install a Solana wallet extension.
          </Text>
        )}
      </VStack>
    </ModalLayout>
  )
}
