import { Button, HStack, Stack, Text } from '@chakra-ui/react'
import type { ModalLayoutProps } from './modal'
import { ModalLayout } from './modal'

interface EmailNudgeProps extends Pick<ModalLayoutProps, 'isOpen' | 'onClose'> {
  /** callback to proceed with an upload without the email address */
  onProceed: () => void
}

export const EmailNudge = ({ isOpen, onClose, onProceed }: EmailNudgeProps) => {
  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      borderRadius="12px"
      title="Continuing without email?"
      px=".8em"
    >
      <Stack spacing="1em" mt="-1em">
        <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
          You forgot to include your email address. If you want to receive a
          reminder 7 days before your uploaded file(s) expires, please enter it.
        </Text>

        <HStack spacing="0.75em">
          <Button
            onClick={onClose}
            flex="1"
            size="md"
            fontWeight="400"
            bg="var(--text-inverse)"
            color="var(--bg-darker)"
            _hover={{
              bg: 'var(--text-inverse)',
            }}
          >
            Enter Email
          </Button>
          <Button
            onClick={onProceed}
            flex="1"
            size="md"
            fontWeight="400"
            variant="outline"
            borderColor="var(--border-hover)"
            color="var(--text-muted)"
            _hover={{
              bg: 'var(--bg-dark)',
              borderColor: 'var(--border-hover)',
            }}
          >
            Proceed Without Email
          </Button>
        </HStack>
      </Stack>
    </ModalLayout>
  )
}
