import { IconButton, useColorMode } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'

export const ThemeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  const isDark = colorMode === 'dark'

  return (
    <IconButton
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleColorMode}
      variant="ghost"
      size="sm"
      icon={isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      color="var(--text-muted)"
      _hover={{
        bg: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-inverse)',
      }}
    />
  )
}