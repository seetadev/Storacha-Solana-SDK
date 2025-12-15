import { extendTheme } from '@chakra-ui/react'
import type { ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: true,
}

export const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      'html, body': {
        background: props.colorMode === 'dark' ? '#080808' : '#f9fafb',
        color: props.colorMode === 'dark' ? '#ffffff' : '#111827',
      },
    }),
  },
})