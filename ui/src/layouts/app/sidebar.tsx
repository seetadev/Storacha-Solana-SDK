import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ArrowsLeftRight,
  ClockCounterClockwise,
  UploadSimple,
} from '@phosphor-icons/react'

const navItems = [
  {
    name: 'Upload',
    path: '/app',
    icon: UploadSimple,
  },
  {
    name: 'History',
    path: '/app/history',
    icon: ClockCounterClockwise,
  },
  {
    name: 'Transactions',
    path: '/app/transactions',
    icon: ArrowsLeftRight,
  },
]

export const Sidebar = () => {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <Box
      width={{ xl: '15%', lg: '20%', md: '0', base: '0' }}
      height="100vh"
      background="var(--bg-dark)"
      borderRight="1px solid var(--border-dark)"
      position="fixed"
      left="0"
      top="0"
      display={{ md: 'none', lg: 'block' }}
    >
      <VStack spacing="0" align="stretch" pt="2em">
        <Box px="1.5em" mb="2em">
          <Text
            fontSize="24px"
            fontWeight="var(--font-weight-bold)"
            className="gradient-text"
          >
            Keep
          </Text>
        </Box>

        <VStack spacing="0.5em" px="1em">
          {navItems.map((item) => {
            const isActive = currentPath === item.path
            const Icon = item.icon

            return (
              <Link key={item.path} to={item.path}>
                <HStack
                  px="1em"
                  py="0.75em"
                  borderRadius="var(--radius-md)"
                  background={isActive ? 'var(--gray-800)' : 'transparent'}
                  color={isActive ? 'var(--primary-500)' : 'var(--text-muted)'}
                  cursor="pointer"
                  transition="var(--transition-base)"
                  width="100%"
                  _hover={{
                    background: 'var(--gray-800)',
                    color: 'var(--text-inverse)',
                  }}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <Text
                    fontSize="var(--font-size-sm)"
                    fontWeight="var(--font-weight-medium)"
                  >
                    {item.name}
                  </Text>
                </HStack>
              </Link>
            )
          })}
        </VStack>
      </VStack>
    </Box>
  )
}
