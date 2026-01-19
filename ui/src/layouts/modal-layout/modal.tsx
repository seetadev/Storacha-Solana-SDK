import type { ChakraProps } from '@chakra-ui/react'
import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { XIcon } from '@phosphor-icons/react'

export interface ModalLayoutProps extends ChakraProps {
  title?: string
  subTitle?: string
  children: React.ReactNode
  size?:
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | 'full'
  onClose: () => void
  isOpen: boolean
  radius?: string
  focusRef?: any
  px?: string
  closeBtnSize?: string
  noCloseButton?: boolean
  background?: string
  noRadius?: boolean
  autoClose?: boolean
}

export const ModalLayout = ({
  size,
  px,
  title,
  onClose,
  isOpen,
  children,
  subTitle,
  radius,
  focusRef,
  closeBtnSize,
  background,
  noCloseButton,
  noRadius,
  autoClose = true,
}: ModalLayoutProps) => {
  return (
    <Modal
      finalFocusRef={focusRef}
      isOpen={isOpen}
      onClose={onClose}
      size={{
        base: 'sm',
        md: size || 'md',
        lg: size || 'xl',
      }}
      isCentered
      closeOnOverlayClick={autoClose}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent
        background={background || 'var(--bg-darker)'}
        borderRadius={noRadius ? 'none' : radius || 'var(--radius-lg)'}
        py={noCloseButton ? '0em' : '10px'}
        height="fit-content"
        px={px || '1.4em'}
        position="relative"
        border="1px solid rgba(255,255,255,0.05)"
      >
        <Flex justifyContent="space-between" alignItems="center" mb="1em">
          {noCloseButton ? null : (
            <Box
              boxSize={closeBtnSize || '32px'}
              onClick={onClose}
              aria-label="modalClose button"
              cursor="pointer"
              display="flex"
              justifyContent="center"
              alignItems="center"
              borderRadius="full"
              _hover={{ bg: 'var(--bg-dark)' }}
              position="absolute"
              top="1"
              right="1"
            >
              <XIcon size={20} color="var(--text-muted)" />
            </Box>
          )}
          {!title ? null : (
            <ModalHeader
              color="var(--text-muted)"
              fontWeight="var(--font-weight-medium)"
              fontSize="var(--font-size-lg)"
              lineHeight="var(--line-height-tight)"
              textTransform="capitalize"
              fontFamily="var(--font-family-sans)"
              px="0.5em"
              flex="1"
            >
              {title}
              <Text
                as="span"
                display="block"
                py=".3em"
                fontWeight="var(--font-weight-normal)"
                fontSize="var(--font-size-sm)"
                lineHeight="var(--line-height-normal)"
                color="var(--text-muted)"
                fontFamily="var(--font-family-sans)"
              >
                {subTitle}
              </Text>
            </ModalHeader>
          )}
        </Flex>
        <ModalBody px={noCloseButton ? '.4em' : '.8em'}>{children}</ModalBody>
      </ModalContent>
    </Modal>
  )
}
