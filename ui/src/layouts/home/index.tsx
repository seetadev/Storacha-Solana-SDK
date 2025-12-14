import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { HomeFooter } from './footer'
import { HomeHeader } from './header'

type HomeLayoutProps = {
  children: ReactNode
}

export const HomeLayout = ({ children }: HomeLayoutProps) => {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      background="var(--bg-darker)"
    >
      <HomeHeader />
      <Box as="main" flex="1" marginTop="70px">
        {children}
      </Box>
      <HomeFooter />
    </Box>
  )
}
