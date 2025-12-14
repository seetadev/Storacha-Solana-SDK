import type { FileRouteTypes } from '@/routeTree.gen'
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  ArrowsLeftRightIcon,
  ChartLineIcon,
  ClockCounterClockwiseIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

const navItems = [
  {
    name: 'Upload',
    path: '/app',
    icon: UploadSimpleIcon,
  },
  {
    name: 'History',
    path: '/app/history',
    icon: ClockCounterClockwiseIcon,
  },
  {
    name: 'Transactions',
    path: '/app/transactions',
    icon: ArrowsLeftRightIcon,
  },
  {
    name: 'Metrics',
    path: '/app/metrics',
    icon: ChartLineIcon,
  },
]

const ITEM_HEIGHT = 42
const ITEM_GAP = 3.2

interface SidebarContentProps {
  onClose?: () => void
}

const SidebarContent = ({ onClose }: SidebarContentProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [activeIndex, setActiveIndex] = useState<number>(
    navItems.findIndex((i) => i.path === pathname) || 0,
  )

  const goToRoute = (index: number, path: FileRouteTypes['to']) => {
    setActiveIndex(index)
    navigate({ to: path })
    onClose?.()
  }
  const indicatorY = activeIndex * (ITEM_HEIGHT + ITEM_GAP)

  return (
    <Box
      height="100%"
      display="flex"
      flexDirection="column"
      px={{ xl: '2em', lg: '1.4em', md: '1.4em', base: '1.4em' }}
      py={{ lg: '2.4em', md: '2em', base: '2em' }}
    >
      <Box mb="3em">
        <HStack spacing="0.5em">
          <Box
            w="32px"
            h="32px"
            bgGradient="linear(to-br, var(--primary-500), var(--primary-700))"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 15px rgba(249, 115, 22, 0.4)"
          >
            <Box w="12px" h="12px" bg="white" borderRadius="full" />
          </Box>
          <Text
            fontSize="24px"
            fontWeight="var(--font-weight-bold)"
            color="var(--text-inverse)"
            letterSpacing="-0.03em"
          >
            Keep
          </Text>
        </HStack>
      </Box>

      <VStack spacing=".2em" position="relative" align="stretch">
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          height={`${ITEM_HEIGHT}px`}
          borderRadius="12px"
          bg="var(--lght-grey)"
          border="1px solid var(--border-hover)"
          transform={`translateY(${indicatorY}px)`}
          transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          pointerEvents="none"
          zIndex={0}
        />

        {navItems.map((item, index) => {
          const isActive = activeIndex === index
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{ textDecoration: 'none' }}
            >
              <HStack
                spacing=".6em"
                height={`${ITEM_HEIGHT}px`}
                borderRadius="12px"
                cursor="pointer"
                position="relative"
                px=".4em"
                zIndex={1}
                onClick={() =>
                  goToRoute(index, item.path as FileRouteTypes['to'])
                }
                transition="background 0.2s ease"
                _hover={{
                  background: isActive
                    ? 'transparent'
                    : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxSize="32px"
                  borderRadius="8px"
                  background={
                    isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                  }
                  transition="background 0.2s ease-in"
                >
                  <Icon
                    size={20}
                    color={
                      isActive ? 'var(--primary-500)' : 'var(--text-muted)'
                    }
                    weight={isActive ? 'fill' : 'regular'}
                    style={{ transition: 'color 0.2s ease-in' }}
                  />
                </Box>
                <Text
                  fontSize="14px"
                  fontWeight={isActive ? '500' : '400'}
                  color={isActive ? 'var(--primary-500)' : 'var(--text-muted)'}
                  transition="color 0.2s ease-in, font-weight 0.2s ease-in"
                >
                  {item.name}
                </Text>
              </HStack>
            </Link>
          )
        })}
      </VStack>
    </Box>
  )
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      <Box
        width={{ xl: '15%', lg: '20%' }}
        height="100vh"
        background="var(--bg-dark)"
        borderRight="1px solid var(--border-dark)"
        position="fixed"
        left="0"
        top="0"
        display={{ base: 'none', md: 'none', lg: 'block' }}
        overflow="hidden"
        zIndex="10"
      >
        <SidebarContent />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <DrawerContent
          background="var(--bg-dark)"
          border="none"
          borderRight="1px solid var(--border-dark)"
        >
          <DrawerCloseButton
            color="var(--text-muted)"
            _hover={{ color: 'var(--text-inverse)', bg: 'var(--lght-grey)' }}
          />
          <DrawerBody p="0">
            <SidebarContent onClose={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
