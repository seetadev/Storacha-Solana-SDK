import { Box, Text } from '@chakra-ui/react'
import type { PaymentChain } from '@toju.network/fil'

interface ChainSelectorProps {
  value: PaymentChain
  onChange: (chain: PaymentChain) => void
}

const CHAINS: Array<{ label: string; value: PaymentChain }> = [
  { label: 'SOL', value: 'sol' },
  { label: 'USDFC', value: 'fil' },
]

const TAB_WIDTH = '4.5em'
const GUTTER = 5

export const ChainSelector = ({ value, onChange }: ChainSelectorProps) => {
  const activeIndex = CHAINS.findIndex((c) => c.value === value)

  return (
    <Box
      role="tablist"
      position="relative"
      display="inline-flex"
      alignItems="center"
      p={`${GUTTER}px`}
      bg="rgba(255,255,255,0.05)"
      border="1px solid rgba(255,255,255,0.1)"
      borderRadius="full"
      userSelect="none"
    >
      <Box
        position="absolute"
        top={`${GUTTER}px`}
        bottom={`${GUTTER}px`}
        left={
          activeIndex === 0 ? `${GUTTER}px` : `calc(${GUTTER}px + ${TAB_WIDTH})`
        }
        width={TAB_WIDTH}
        bg="var(--text-inverse)"
        border="1px solid rgba(255,255,255,0.15)"
        borderRadius="full"
        transition="left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        pointerEvents="none"
        zIndex={0}
      />

      {CHAINS.map((chain, i) => (
        <Box
          key={chain.value}
          role="tab"
          aria-selected={value === chain.value}
          tabIndex={value === chain.value ? 0 : -1}
          position="relative"
          zIndex={1}
          width={TAB_WIDTH}
          textAlign="center"
          py="0.3em"
          borderRadius="full"
          cursor="pointer"
          onClick={() => onChange(chain.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onChange(chain.value)
            if (e.key === 'ArrowRight')
              onChange(CHAINS[(i + 1) % CHAINS.length].value)
            if (e.key === 'ArrowLeft')
              onChange(CHAINS[(i - 1 + CHAINS.length) % CHAINS.length].value)
          }}
          _focusVisible={{
            outline: '2px solid var(--primary-500)',
            outlineOffset: '2px',
          }}
        >
          <Text
            fontSize="var(--font-size-xs)"
            fontWeight="var(--font-weight-semibold)"
            color={
              value === chain.value ? 'var(--bg-darker)' : 'var(--text-muted)'
            }
            transition="color 0.3s ease"
            lineHeight="1"
          >
            {chain.label}
          </Text>
        </Box>
      ))}
    </Box>
  )
}
