import { HStack, Text, VStack } from '@chakra-ui/react'
import { WarningCircleIcon } from '@phosphor-icons/react'

interface ErrorListProps {
  errors: Array<string>
}

export const ErrorList = ({ errors }: ErrorListProps) => {
  if (errors.length === 0) return null

  return (
    <VStack
      spacing="0.75em"
      align="stretch"
      p="1em"
      bg="rgba(239, 68, 68, 0.05)"
      border="1px solid rgba(239, 68, 68, 0.2)"
      borderRadius="var(--radius-md)"
    >
      {errors.map((error) => (
        <HStack key={crypto.randomUUID()} spacing="0.75em">
          <WarningCircleIcon size={18} color="var(--error)" weight="fill" />
          <Text
            fontSize="var(--font-size-sm)"
            color="var(--error)"
            lineHeight="var(--line-height-snug)"
          >
            {error}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
}
