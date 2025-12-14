import { Box, Button, Container, HStack, Text } from '@chakra-ui/react'
import { GithubLogoIcon, WalletIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

export const HomeHeader = () => {
  return (
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

          <HStack spacing="1.5em">
            <Link to="/">
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
            </Link>

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
                display={{ lg: 'block', md: 'block', base: 'none' }}
              >
                <GithubLogoIcon size={22} />
              </Button>

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
              >
                Connect Wallet
              </Button>
            </HStack>
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
