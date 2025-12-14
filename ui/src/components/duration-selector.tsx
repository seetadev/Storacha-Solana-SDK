import { Box, HStack, Input, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { ClockIcon } from '@phosphor-icons/react'
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr'

interface StorageOption {
  duration: number
  label: string
  description?: string
}

const STORAGE_OPTIONS: Array<StorageOption> = [
  {
    duration: 7,
    label: '7 Days',
    description: 'For temporary sharing',
  },
  {
    duration: 30,
    label: '30 Days',
    description: 'A standard month',
  },
  {
    duration: 90,
    label: '90 Days',
    description: 'Good for a quarter',
  },
  {
    duration: 365,
    label: '1 Year',
    description: 'Long-term archival',
  },
]

interface StorageDurationSelectorProps {
  selectedDuration: number
  onDurationChange: (duration: number) => void
  email?: string
  onEmailChange?: (email: string) => void
}

export const StorageDurationSelector = ({
  selectedDuration,
  onDurationChange,
  email,
  onEmailChange,
}: StorageDurationSelectorProps) => {
  return (
    <VStack spacing="1.5em" align="stretch">
      <VStack spacing="1em" align="stretch">
        <HStack spacing=".5em">
          <ClockIcon size={20} color="var(--text-muted)" weight="regular" />
          <Text
            fontWeight="var(--font-weight-normal)"
            color="var(--text-muted)"
            fontSize="var(--font-size-base)"
          >
            Storage Duration
          </Text>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing="1em">
          {STORAGE_OPTIONS.map((option) => (
            <Box
              key={option.duration}
              onClick={() => onDurationChange(option.duration)}
              p="1em"
              border="1px solid"
              borderColor={
                selectedDuration === option.duration
                  ? 'var(--primary-500)'
                  : 'var(--border-hover)'
              }
              borderRadius="var(--radius-md)"
              cursor="pointer"
              bg={
                selectedDuration === option.duration
                  ? 'rgba(249, 115, 22, 0.08)'
                  : 'var(--bg-dark)'
              }
              transition="all 0.2s ease"
              _hover={{
                borderColor:
                  selectedDuration === option.duration
                    ? 'var(--primary-500)'
                    : 'var(--border-hover)',
                bg:
                  selectedDuration === option.duration
                    ? 'rgba(249, 115, 22, 0.12)'
                    : 'var(--lght-grey)',
              }}
            >
              <Text
                fontWeight="var(--font-weight-medium)"
                color="var(--text-inverse)"
                fontSize="var(--font-size-sm)"
              >
                {option.label}
              </Text>
              <Text
                fontSize="var(--font-size-xs)"
                color="var(--text-muted)"
                mt="0.25em"
              >
                {option.description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        <HStack spacing=".75em" align="center">
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
          >
            Custom:
          </Text>
          <Input
            type="number"
            placeholder="Days"
            value={selectedDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0) {
                onDurationChange(value)
              }
            }}
            w="120px"
            h="40px"
            bg="var(--bg-dark)"
            border="1px solid var(--border-hover)"
            borderRadius="var(--radius-md)"
            color="var(--text-inverse)"
            fontSize="var(--font-size-sm)"
            _hover={{
              borderColor: 'var(--border-hover)',
            }}
            _focus={{
              borderColor: 'var(--primary-500)',
              boxShadow: '0 0 0 1px var(--primary-500)',
            }}
            _placeholder={{
              color: 'var(--text-tertiary)',
            }}
          />
          <Text
            color="var(--text-muted)"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-medium)"
          >
            days
          </Text>
        </HStack>
      </VStack>

      <VStack spacing="1em" align="stretch">
        <HStack spacing=".5em">
          <PaperPlaneTiltIcon
            size={20}
            weight="regular"
            color="var(--text-muted)"
          />
          <Text
            fontWeight="var(--font-weight-normal)"
            color="var(--text-muted)"
            fontSize="var(--font-size-base)"
          >
            Email for Reminders
          </Text>
        </HStack>

        <VStack spacing=".5em" align="stretch">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={email || ''}
            onChange={(e) => onEmailChange?.(e.target.value)}
            h="44px"
            bg="var(--bg-dark)"
            border="1px solid var(--border-hover)"
            borderRadius="var(--radius-md)"
            color="var(--text-inverse)"
            fontSize="var(--font-size-sm)"
            _hover={{
              borderColor: 'var(--border-hover)',
            }}
            _focus={{
              borderColor: 'var(--primary-500)',
              boxShadow: '0 0 0 1px var(--primary-500)',
            }}
            _placeholder={{
              color: 'var(--text-tertiary)',
            }}
          />
          <Text
            fontSize="var(--font-size-xs)"
            color="var(--text-muted)"
            lineHeight="var(--line-height-relaxed)"
          >
            We'll send you reminders before your storage expires (optional)
          </Text>
        </VStack>
      </VStack>
    </VStack>
  )
}
