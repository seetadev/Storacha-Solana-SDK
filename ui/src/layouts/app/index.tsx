import { Box, Stack, Text } from '@chakra-ui/react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import type ReactNode from 'react'

type AppLayoutProps = {
  children: ReactNode
  pageTitle?: string
  pageDescription?: string
}

export const AppLayout = ({
  children,
  pageTitle,
  pageDescription,
}: AppLayoutProps) => {
  return (
    <Stack direction="row" gap="0" height="100vh" overflow="hidden">
      <Sidebar />
      <Box
        display="flex"
        flexFlow="column"
        width={{ xl: '85%', lg: '80%', md: '100%', base: '100%' }}
        height="100vh"
        marginLeft="auto"
        background="var(--bg-darker)"
      >
        <Header />
        <Box
          px={{ lg: '2em', md: '1.5em', base: '1em' }}
          py="2em"
          flex="1"
          overflow="auto"
          marginTop="70px"
        >
          {(pageTitle || pageDescription) && (
            <Stack gap=".6em" mb="2em">
              {pageTitle && (
                <Text
                  fontSize="28px"
                  color="var(--text-inverse)"
                  fontWeight="var(--font-weight-semibold)"
                >
                  {pageTitle}
                </Text>
              )}
              {pageDescription && (
                <Text
                  fontSize="var(--font-size-sm)"
                  color="var(--text-muted)"
                  lineHeight="var(--line-height-relaxed)"
                >
                  {pageDescription}
                </Text>
              )}
            </Stack>
          )}
          {children}
        </Box>
      </Box>
    </Stack>
  )
}
