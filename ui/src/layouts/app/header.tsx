import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Wallet } from 'phosphor-react'

export const Header = () => {
  return (
    <Box
      height="70px"
      px={{ xl: '2em', md: '1.5em', lg: '1.5em', base: '1em' }}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      position="fixed"
      width={{ xl: '85%', lg: '80%', md: '100%', base: '100%' }}
      background="var(--bg-darker)"
      zIndex="10"
      borderBottom="1px solid var(--border-dark)"
    >
      <HStack spacing="1em">
        <Box
          px="0.75em"
          py="0.4em"
          borderRadius="var(--radius-md)"
          background="var(--gray-800)"
          border="1px solid var(--border-dark)"
        >
          <Text
            fontSize="var(--font-size-xs)"
            color="var(--primary-500)"
            fontWeight="var(--font-weight-medium)"
          >
            Testnet
          </Text>
        </Box>
      </HStack>

      <HStack spacing="1em">
        <Button
          fontSize="var(--font-size-sm)"
          fontWeight="var(--font-weight-medium)"
          color="var(--text-inverse)"
          background="var(--gray-800)"
          border="1px solid var(--border-dark)"
          height="40px"
          transition="var(--transition-base)"
          _hover={{
            background: 'var(--gray-700)',
            borderColor: 'var(--primary-500)',
          }}
          leftIcon={<Wallet size={20} />}
        >
          Connect Wallet
        </Button>
      </HStack>
    </Box>
  )
}
