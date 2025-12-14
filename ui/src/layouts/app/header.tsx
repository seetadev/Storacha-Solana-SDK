import { ConnectWallet } from '@/components/connect-wallet'
import { useAuthContext } from '@/hooks/context/auth'
import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { LinkBreakIcon, ListIcon, WalletIcon } from '@phosphor-icons/react'
import { useState } from 'react'

interface HeaderProps {
  onMenuOpen: () => void
}

export const Header = ({ onMenuOpen }: HeaderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthContext()

  const truncatePublicKey = (publicKey: string) => {
    if (!publicKey) return ''
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
  }

  return (
    <>
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
          {isAuthenticated && user ? (
            <HStack
              height="40px"
              width="fit-content"
              px="1em"
              bg="rgba(255,255,255,0.05)"
              border="1px solid rgba(255,255,255,0.1)"
              borderRadius="full"
              justifyContent="space-between"
              spacing="0.75em"
            >
              <WalletIcon size={18} color="var(--primary-500)" weight="fill" />
              <Text
                color="var(--text-inverse)"
                fontSize="var(--font-size-sm)"
                fontWeight="var(--font-weight-medium)"
              >
                {truncatePublicKey(user)}
              </Text>
              <Box
                as="span"
                onClick={logout}
                cursor="pointer"
                color="var(--text-muted)"
                display="flex"
                alignItems="center"
                _hover={{
                  color: 'var(--error)',
                }}
                transition="color 0.2s"
              >
                <LinkBreakIcon size={20} weight="bold" />
              </Box>
            </HStack>
          ) : (
            <Box
              as="button"
              height="40px"
              px="1.5em"
              fontSize="var(--font-size-sm)"
              fontWeight="var(--font-weight-medium)"
              bg="rgba(255,255,255,0.05)"
              border="1px solid rgba(255,255,255,0.1)"
              color="var(--text-inverse)"
              backdropFilter="blur(5px)"
              borderRadius="full"
              transition="all 0.2s"
              display="flex"
              alignItems="center"
              gap="0.5em"
              cursor="pointer"
              _hover={{
                borderColor: 'var(--primary-500)',
                boxShadow: '0 0 15px rgba(249, 115, 22, 0.2)',
                bg: 'rgba(249, 115, 22, 0.1)',
              }}
              onClick={() => setIsModalOpen(true)}
            >
              <WalletIcon size={18} weight="fill" />
              <Text>Connect Wallet</Text>
            </Box>
          )}
        </Box>
      </Box>

      <ConnectWallet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
