import { Box, Container, Stack, useDisclosure } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

type AppLayoutProps = {
  children: ReactNode
  pageTitle?: string
  pageDescription?: string
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Stack direction="row" gap="0" height="100vh" overflow="hidden">
      <Sidebar isOpen={isOpen} onClose={onClose} />
      <Box
        display="flex"
        flexFlow="column"
        width={{ xl: '85%', lg: '80%', md: '100%', base: '100%' }}
        height="100vh"
        marginLeft="auto"
        background="var(--bg-darker)"
      >
        <Header onMenuOpen={onOpen} />
        <Box
          flex="1"
          overflow="auto"
          marginTop="70px"
          display="flex"
          justifyContent="center"
        >
          <Container
            maxW={{ xl: 'container.lg', lg: '100%', md: '100%', base: '100%' }}
            px={{ lg: '2em', md: '1.5em', base: '1em' }}
            py="2em"
            width="100%"
            mb="2em"
            height="fit-content"
          >
            {children}
          </Container>
        </Box>
      </Box>
    </Stack>
  )
}
