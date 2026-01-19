import { Button, HStack, Text, VStack } from '@chakra-ui/react'
import { ModalLayout } from './modal'

interface EmailNudgeProps {
  isOpen: boolean
  onClose: () => void
  onProceedWithoutEmail: () => void
}

export const EmailNudge = ({
  isOpen,
  onClose,
  onProceedWithoutEmail,
}: EmailNudgeProps) => {
  return (
    <ModalLayout
      title="No Email Provided"
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      px="1.5em"
      radius="1em"
    >
      <VStack spacing="1.5em" align="stretch" pb="1em">
        <Text
          fontSize="var(--font-size-sm)"
          color="var(--text-muted)"
          lineHeight="var(--line-height-relaxed)"
        >
          You forgot to include your email address. If you want to receive a
          reminder 7 days before your uploaded file(s) expires, please enter it.
        </Text>

        <HStack spacing="1em" justify="flex-end">
          <Button
            onClick={onClose}
            size="md"
            variant="ghost"
            color="var(--text-muted)"
            _hover={{ bg: 'var(--bg-dark)' }}
          >
            Go Back
          </Button>
          <Button
            onClick={onProceedWithoutEmail}
            size="md"
            bg="var(--text-inverse)"
            color="var(--eerie-black)"
            borderRadius="var(--radius-md)"
            fontWeight="var(--font-weight-semibold)"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(24, 24, 23, 0.4)',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
          >
            Continue Without Email
          </Button>
        </HStack>
      </VStack>
    </ModalLayout>
  )
}
