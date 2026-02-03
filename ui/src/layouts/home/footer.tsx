import {
  Box,
  Container,
  Grid,
  HStack,
  Link,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  DiscordLogoIcon,
  GithubLogoIcon,
  TwitterLogoIcon,
} from '@phosphor-icons/react'
import type { ReactElement, ReactNode } from 'react'

export const HomeFooter = () => {
  return (
    <Box
      as="footer"
      position="relative"
      borderTop="1px solid var(--border-dark)"
      bg="var(--bg-darker)"
      overflow="hidden"
    >
      <Box
        position="absolute"
        bottom="-20%"
        left="50%"
        transform="translateX(-50%)"
        width="80%"
        height="300px"
        bg="radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(0,0,0,0) 70%)"
        filter="blur(60px)"
        pointerEvents="none"
      />

      <Container maxW="container.xl" py="6em" position="relative" zIndex="1">
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr 1fr' }} gap="4em">
          <VStack align="flex-start" spacing="2em">
            <VStack align="flex-start" spacing="0.5em">
              <Text
                fontSize="28px"
                fontWeight="bold"
                letterSpacing="-0.03em"
                bgGradient="linear(to-r, #fff, var(--gray-500))"
                bgClip="text"
              >
                toju.
              </Text>
              <Text color="var(--text-muted)" maxW="300px" lineHeight="1.6">
                The crypto-native bridge to decentralized storage on Filecoin.
                No credit cards, no subscriptions.
              </Text>
            </VStack>

            <Box
              as="a"
              p="1px"
              bgGradient="linear(to-r, var(--gray-800), var(--primary-900), var(--gray-800))"
              borderRadius="var(--radius-lg)"
              href="https://plgd.xyz"
              target="__blank"
            >
              <Box
                bg="var(--bg-dark)"
                borderRadius="var(--radius-lg)"
                px="1em"
                py="0.8em"
              >
                <Text
                  fontSize="xs"
                  color="var(--gray-400)"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  mb="2px"
                >
                  Borne out of
                </Text>
                <HStack>
                  <Box
                    w="8px"
                    h="8px"
                    bg="#0090FF"
                    borderRadius="full"
                    boxShadow="0 0 8px #0090FF"
                  />
                  <Text fontWeight="600" color="var(--text-inverse)">
                    Protocol Labs
                  </Text>
                  <Text color="var(--gray-500)">Dev Guild</Text>
                </HStack>
              </Box>
            </Box>
          </VStack>

          <VStack align="flex-start" spacing="1.5em">
            <Text color="var(--text-inverse)" fontWeight="bold">
              Resources
            </Text>
            <Stack spacing="0.8em">
              <LinkItem href="https://docs.toju.network" isExternal>
                Documentation
              </LinkItem>
              <LinkItem
                href="https://docs.toju.network/sdk/overview"
                isExternal
              >
                SDK Reference
              </LinkItem>
              <LinkItem href="https://docs.toju.network/pricing" isExternal>
                Pricing
              </LinkItem>
            </Stack>
          </VStack>

          <VStack align="flex-start" spacing="1.5em">
            <Text color="var(--text-inverse)" fontWeight="bold">
              Community
            </Text>
            <Stack spacing="0.8em">
              <LinkItem
                href="https://github.com/seetadev/storacha-solana-sdk"
                isExternal
                icon={<GithubLogoIcon />}
              >
                GitHub
              </LinkItem>
              <LinkItem href="#" icon={<TwitterLogoIcon />}>
                Twitter
              </LinkItem>
              <LinkItem href="#" icon={<DiscordLogoIcon />}>
                Discord
              </LinkItem>
            </Stack>
          </VStack>
        </Grid>

        <Box
          mt="6em"
          pt="2em"
          borderTop="1px solid var(--border-dark)"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap="1em"
        >
          <Text fontSize="sm" color="var(--gray-600)">
            &copy; {new Date().getFullYear()} toju.
          </Text>
          <HStack spacing="2em">
            <Link
              href="/terms"
              fontSize="sm"
              color="var(--gray-600)"
              _hover={{ color: 'var(--text-muted)', textDecor: 'none' }}
            >
              Terms
            </Link>
          </HStack>
        </Box>
      </Container>
    </Box>
  )
}

type LinkItemProps = {
  href: string
  children: ReactNode
  icon?: ReactElement
  isExternal?: boolean
}

const LinkItem = ({ href, children, icon, isExternal }: LinkItemProps) => (
  <Link
    href={href}
    isExternal={isExternal}
    color="var(--text-muted)"
    display="flex"
    alignItems="center"
    gap="0.5em"
    transition="0.2s"
    _hover={{
      color: 'var(--primary-400)',
      transform: 'translateX(2px)',
      textDecoration: 'none',
    }}
  >
    {icon}
    <Text fontSize="sm">{children}</Text>
  </Link>
)
