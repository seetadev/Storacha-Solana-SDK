import { Button, HStack, Stack, Text } from '@chakra-ui/react'
import type { ModalLayoutProps } from './modal'
import { ModalLayout } from './modal'

interface ShortDurationWarningProps extends Pick<ModalLayoutProps, 'isOpen' | 'onClose'> {
  onProceed: () => void
  duration: number
}

export const ShortDurationWarning = ({
  isOpen,
  onClose,
  onProceed,
  duration,
}: ShortDurationWarningProps) => {
  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      borderRadius="12px"
      title="No reminders for short durations"
      px=".8em"
    >
      <Stack spacing="1em" mt="-1em">
        <Text fontSize="var(--font-size-sm)" color="var(--text-muted)">
          You've selected a storage duration of {duration} day{duration !== 1 ? 's' : ''}. 
          We won't send reminder emails for uploads stored for less than 7 days.
        </Text>

        <HStack spacing="0.75em">
          <Button
            onClick={onProceed}
            flex="1"
            size="md"
            fontWeight="400"
            bg="var(--text-inverse)"
            color="var(--bg-darker)"
            _hover={{
              bg: 'var(--text-inverse)',
            }}
          >
            Continue Anyway
          </Button>
          <Button
            onClick={onClose}
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
            Change Duration
          </Button>
        </HStack>
      </Stack>
    </ModalLayout>
  )
}
