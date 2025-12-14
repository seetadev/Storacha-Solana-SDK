import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Star, Wallet } from '@phosphor-icons/react'

export const HomeHeader = () => {
  return (
    <Box
      as="header"
      height="70px"
      px={{ xl: '4em', md: '2em', lg: '3em', base: '1em' }}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      background="var(--bg-darker)"
      borderBottom="1px solid var(--border-dark)"
      position="fixed"
      width="100%"
      top="0"
      zIndex="100"
    >
      <Link to="/">
        <Text
          fontSize="24px"
          fontWeight="var(--font-weight-bold)"
          className="gradient-text"
          cursor="pointer"
        >
          Keep
        </Text>
      </Link>

      <HStack spacing="1em">
        <Button
          as="a"
          href="https://github.com/seetadev/keep"
          target="_blank"
          rel="noopener noreferrer"
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-inverse)"
          background="transparent"
          border="1px solid var(--border-dark)"
          height="40px"
          transition="var(--transition-base)"
          _hover={{
            borderColor: 'var(--primary-500)',
            color: 'var(--primary-500)',
          }}
          leftIcon={<Star size={20} />}
        >
          Star
        </Button>

        <Button
          as="a"
          href="/docs"
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-inverse)"
          background="transparent"
          border="1px solid var(--border-dark)"
          height="40px"
          transition="var(--transition-base)"
          _hover={{
            borderColor: 'var(--primary-500)',
            color: 'var(--primary-500)',
          }}
          leftIcon={<BookOpen size={20} />}
        >
          Docs
        </Button>

        <Button
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-inverse)"
          className="gradient-primary"
          height="40px"
          transition="var(--transition-base)"
          _hover={{
            opacity: 0.9,
          }}
          leftIcon={<Wallet size={20} />}
        >
          Connect Wallet
        </Button>
      </HStack>
    </Box>
  )
}
