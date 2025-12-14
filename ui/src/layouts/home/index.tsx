import { Box } from '@chakra-ui/react'
import { HomeHeader } from './header'
import { HomeFooter } from './footer'
import type ReactNode from 'react'

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
