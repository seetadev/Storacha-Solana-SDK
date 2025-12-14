import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { GithubLogo, TwitterLogo } from 'phosphor-react'

export const HomeFooter = () => {
  return (
    <Box
      as="footer"
      width="100%"
      background="var(--bg-dark)"
      borderTop="1px solid var(--border-dark)"
      py="3em"
      px={{ xl: '4em', md: '2em', lg: '3em', base: '1em' }}
    >
      <VStack spacing="2em">
        <VStack spacing="0.5em">
          <Text
            fontSize="20px"
            fontWeight="var(--font-weight-bold)"
            className="gradient-text"
          >
            Keep
          </Text>
          <Text
            fontSize="var(--font-size-sm)"
            color="var(--text-muted)"
            textAlign="center"
          >
            Store data on IPFS and pay with SOL
          </Text>
        </VStack>

        <HStack spacing="1.5em">
          <Box
            as="a"
            href="https://github.com/yourusername/keep"
            target="_blank"
            rel="noopener noreferrer"
            cursor="pointer"
            transition="var(--transition-base)"
            _hover={{ color: 'var(--primary-500)' }}
          >
            <GithubLogo size={24} />
          </Box>
          <Box
            as="a"
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            cursor="pointer"
            transition="var(--transition-base)"
            _hover={{ color: 'var(--primary-500)' }}
          >
            <TwitterLogo size={24} />
          </Box>
        </HStack>

        <Text fontSize="var(--font-size-xs)" color="var(--text-muted)">
          © {new Date().getFullYear()} Keep. All rights reserved.
        </Text>
      </VStack>
    </Box>
  )
}
