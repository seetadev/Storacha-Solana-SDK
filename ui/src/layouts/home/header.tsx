import { ConnectWallet } from '@/components/connect-wallet'
import {
  Box,
  Button,
  Link as ChakraLink,
  Container,
  HStack,
  Text,
} from '@chakra-ui/react'
import {
  GithubLogoIcon,
  LinkBreakIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthContext } from '../../hooks/context/auth'

export const HomeHeader = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthContext()

  const truncatePublicKey = (publicKey: string) => {
    if (!publicKey) return ''
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
  }

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top="0"
        left="0"
        right="0"
        height="80px"
        zIndex="100"
        background="rgba(6, 7, 14, 0.6)"
        backdropFilter="blur(12px)"
        borderBottom="1px solid rgba(255,255,255,0.05)"
        transition="all 0.3s ease"
      >
        <Container maxW="container.xl" height="100%">
          <HStack height="100%" justifyContent="space-between">
            <Link to="/">
              <HStack spacing="0.5em" cursor="pointer">
                <Box
                  w="32px"
                  h="32px"
                  bgGradient="linear(to-br, var(--primary-500), var(--primary-700))"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 0 15px rgba(249, 115, 22, 0.4)"
                >
                  <Box w="12px" h="12px" bg="white" borderRadius="full" />
                </Box>
                <Text
                  fontSize="24px"
                  fontWeight="var(--font-weight-bold)"
                  color="var(--text-inverse)"
                  letterSpacing="-0.03em"
                >
                  Keep
                </Text>
              </HStack>
            </Link>

            <HStack spacing="1.5em" alignItems="center">
              <ChakraLink href="https://docs.toju.network" target="__blank">
                <Text
                  fontSize="var(--font-size-sm)"
                  fontWeight="500"
                  color="var(--text-muted)"
                  _hover={{ color: 'var(--text-inverse)' }}
                  transition="color 0.2s"
                  display={{ lg: 'block', md: 'block', base: 'none' }}
                >
                  Documentation
                </Text>
              </ChakraLink>

              <HStack spacing="0.8em">
                <Button
                  as="a"
                  background="none"
                  href="https://github.com/seetadev/storacha-solana-sdk"
                  target="_blank"
                  color="var(--text-muted)"
                  borderRadius="8px"
                  _hover={{ color: 'var(--text-inverse)', bg: 'none' }}
                  size="sm"
                  display={{ lg: 'flex', md: 'flex', base: 'none' }}
                >
                  <GithubLogoIcon size={22} />
                </Button>

                {isAuthenticated && user ? (
                  <HStack
                    height="40px"
                    width="fit-content"
                    px="1em"
                    bg="rgba(255,255,255,0.05)"
                    border="1px solid rgba(255,255,255,0.1)"
                    borderRadius="full"
                    justifyContent="space-between"
                  >
                    <Text
                      color="var(--text-inverse)"
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      {truncatePublicKey(user)}
                    </Text>
                    <Box
                      as="span"
                      onClick={logout}
                      cursor="pointer"
                      color="var(--text-muted)"
                      _hover={{
                        color: 'var(--red-mead)',
                      }}
                      transition="color 0.2s"
                    >
                      <LinkBreakIcon size={20} weight="bold" />
                    </Box>
                  </HStack>
                ) : (
                  <Button
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
                    _hover={{
                      borderColor: 'var(--primary-500)',
                      boxShadow: '0 0 15px rgba(249, 115, 22, 0.2)',
                      bg: 'rgba(249, 115, 22, 0.1)',
                    }}
                    leftIcon={<WalletIcon size={18} weight="fill" />}
                    onClick={() => setIsModalOpen(true)}
                  >
                    Connect Wallet
                  </Button>
                )}
              </HStack>
            </HStack>
          </HStack>
        </Container>
      </Box>
      <ConnectWallet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
