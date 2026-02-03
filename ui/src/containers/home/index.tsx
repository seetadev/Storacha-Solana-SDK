import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CoinsIcon,
  HardDrivesIcon,
  LightningIcon,
} from '@phosphor-icons/react'
import { RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr'
import { Link } from '@tanstack/react-router'
import { useAuthContext } from '@/hooks/context'

const styles = {
  beam: {
    position: 'absolute' as const,
    top: '-100px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '400px',
    background:
      'conic-gradient(from 180deg at 50% 50%, var(--primary-900) 0deg, var(--primary-500) 40deg, transparent 90deg, transparent 270deg, var(--primary-500) 320deg, var(--primary-900) 360deg)',
    filter: 'blur(90px)',
    opacity: 0.15,
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  gradientText: {
    background: 'linear-gradient(135deg, #fff 0%, var(--primary-400) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  card: {
    border: '1px solid var(--border-dark)',
    background: 'var(--bg-dark)',
    padding: '1em',
    borderRadius: 'var(--radius-lg)',
    transition: 'all var(--transition-base)',
    cursor: 'default',
    _hover: {
      cursor: 'pointer',
      background: 'none',
    },
  },
}

export const HomePage = () => {
  const { isAuthenticated } = useAuthContext()

  return (
    <Box position="relative" overflow="hidden">
      <Box sx={styles.beam} />

      <Container
        maxW="container.xl"
        pt="6em"
        pb="4em"
        position="relative"
        zIndex="1"
      >
        <VStack spacing="2em" textAlign="center">
          <Box
            display="inline-flex"
            alignItems="center"
            px="1em"
            py="0.4em"
            borderRadius="full"
            border="1px solid var(--primary-900)"
            background="rgba(249, 115, 22, 0.1)"
          >
            <Box
              w="6px"
              h="6px"
              borderRadius="full"
              bg="var(--primary-500)"
              mr="0.6em"
              boxShadow="0 0 8px var(--primary-500)"
            />
            <Text
              fontSize="var(--font-size-xs)"
              color="var(--primary-200)"
              fontWeight="var(--font-weight-medium)"
            >
              Live on Mainnet
            </Text>
          </Box>

          <Heading
            as="h1"
            fontSize={{ base: '42px', md: '64px', lg: '76px' }}
            fontWeight="var(--font-weight-bold)"
            lineHeight="1.05"
            letterSpacing="-0.03em"
            color="var(--text-inverse)"
            textAlign="center"
          >
            Keep it forever. <br />
            <Box as="span" sx={styles.gradientText}>
              Pay with crypto.
            </Box>
          </Heading>

          <Text
            fontSize="var(--font-size-lg)"
            color="var(--text-muted)"
            maxW="600px"
            textAlign="center"
            lineHeight="var(--line-height-relaxed)"
            pt="-0.8em"
          >
            True permanence for your digital assets. Store data on IPFS via
            Storacha's decentralized network and settle the fees instantly with
            SOL. No banks.
          </Text>

          <HStack
            spacing={{ lg: '1em', md: '1em', base: '.6em' }}
            pt="1.5em"
            justify="center"
            flexWrap="wrap"
          >
            <Button
              as={Link}
              to="/app"
              disabled={!isAuthenticated}
              height="54px"
              px="2.5em"
              fontSize="var(--font-size-base)"
              background="var(--primary-600)"
              color="white"
              fontWeight="600"
              borderRadius="full"
              width={{ base: '100%', lg: 'fit-content', md: 'fit-content' }}
              boxShadow="0 0 20px rgba(249, 115, 22, 0.4)"
              _hover={{
                background: 'var(--primary-500)',
                transform: 'translateY(-2px)',
                boxShadow: '0 0 30px rgba(249, 115, 22, 0.6)',
              }}
              transition="all 0.2s"
              rightIcon={<ArrowRightIcon weight="bold" />}
            >
              {isAuthenticated ? 'Get started' : 'Connect wallet'}
            </Button>

            <Box
              as="code"
              height="54px"
              px="2.5em"
              alignItems="center"
              border="1px solid rgba(255,255,255,0.1)"
              cursor="pointer"
              background="rgba(255,255,255,0.05)"
              borderRadius="full"
              color="var(--text-muted)"
              width={{ base: '100%', lg: 'fit-content', md: 'fit-content' }}
              fontFamily="monospace"
              fontSize="var(--font-size-base)"
              display={{ lg: 'flex', md: 'flex', base: 'none' }}
            >
              pnpm i @toju.network/sol
            </Box>
          </HStack>
        </VStack>
      </Container>

      <Box borderTop="1px solid var(--border-dark)" bg="var(--bg-dark)">
        <Container maxW="container.xl" py="6em">
          <SimpleGrid columns={{ base: 1, md: 3, xl: 3 }} gap="1em">
            <Box sx={styles.card}>
              <Stack spacing="1.5em">
                <Box
                  w="48px"
                  h="48px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="var(--radius-md)"
                  bg="var(--bg-darker)"
                  border="1px solid var(--border-dark)"
                  color="var(--primary-500)"
                >
                  <HardDrivesIcon size={24} weight="fill" />
                </Box>
                <Stack spacing="0.5em">
                  <Text
                    fontSize="var(--font-size-lg)"
                    fontWeight="var(--font-weight-semibold)"
                    color="var(--text-inverse)"
                  >
                    Upload Data
                  </Text>
                  <Text
                    color="var(--text-muted)"
                    fontSize="var(--font-size-sm)"
                  >
                    Upload files via our Dashboard or SDK. Your data is
                    encrypted, hashed, and prepared for decentralized warm
                    storage.
                  </Text>
                </Stack>
              </Stack>
            </Box>

            <Box sx={styles.card}>
              <Stack spacing="1.5em">
                <Box
                  w="48px"
                  h="48px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="var(--radius-md)"
                  bg="var(--bg-darker)"
                  border="1px solid var(--border-dark)"
                  color="var(--primary-500)"
                >
                  <CoinsIcon size={24} weight="fill" />
                </Box>
                <Stack spacing="0.5em">
                  <Text
                    fontSize="var(--font-size-lg)"
                    fontWeight="var(--font-weight-semibold)"
                    color="var(--text-inverse)"
                  >
                    Pay with SOL
                  </Text>
                  <Text
                    color="var(--text-muted)"
                    fontSize="var(--font-size-sm)"
                  >
                    Settle your storage fees instantly with SOL. No credit card
                    required. Only pay for what you use.
                  </Text>
                </Stack>
              </Stack>
            </Box>

            <Box sx={styles.card}>
              <Stack spacing="1.5em">
                <Box
                  w="48px"
                  h="48px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="var(--radius-md)"
                  bg="var(--bg-darker)"
                  border="1px solid var(--border-dark)"
                  color="var(--primary-500)"
                >
                  <ArrowsClockwiseIcon size={24} weight="fill" />
                </Box>
                <Stack spacing="0.5em">
                  <Text
                    fontSize="var(--font-size-lg)"
                    fontWeight="var(--font-weight-semibold)"
                    color="var(--text-inverse)"
                  >
                    Renew Storage
                  </Text>
                  <Text
                    color="var(--text-muted)"
                    fontSize="var(--font-size-sm)"
                  >
                    You decide how long to store your files. We'll notify you
                    via email when your storage is about to expire, so you can
                    easily renew.
                  </Text>
                </Stack>
              </Stack>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      <Box borderTop="1px solid var(--border-dark)" py="8em">
        <VStack spacing="2.5em">
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-sm)"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Powered by modern infrastructure
          </Text>
          <HStack spacing="3em" opacity="0.6">
            <HStack cursor="pointer">
              <RocketLaunchIcon size={30} color="var(--text-inverse)" />
              <Text
                color="var(--text-inverse)"
                fontSize={{
                  xl: 'var(--font-size-xl)',
                  lg: 'var(--font-size-lg)',
                  md: 'var(--font-size-md)',
                  base: 'var(--font-size-base)',
                }}
                fontWeight="bold"
              >
                Storacha
              </Text>
            </HStack>
            <HStack cursor="pointer">
              <HardDrivesIcon size={30} color="var(--text-inverse)" />
              <Text
                fontSize={{
                  xl: 'var(--font-size-xl)',
                  lg: 'var(--font-size-lg)',
                  md: 'var(--font-size-md)',
                  base: 'var(--font-size-base)',
                }}
                color="var(--text-inverse)"
                fontWeight="bold"
              >
                Filecoin
              </Text>
            </HStack>
            <HStack cursor="pointer">
              <LightningIcon size={30} color="var(--text-inverse)" />
              <Text
                fontSize={{
                  xl: 'var(--font-size-xl)',
                  lg: 'var(--font-size-lg)',
                  md: 'var(--font-size-md)',
                  base: 'var(--font-size-base)',
                }}
                color="var(--text-inverse)"
                fontWeight="bold"
              >
                Solana
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}
