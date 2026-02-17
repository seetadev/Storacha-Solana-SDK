import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'

export type PaymentMethod = 'sol' | 'usdfc'

interface PaymentSelectorProps {
  onPaymentMethodChange: (method: PaymentMethod) => void
  children: (paymentMethod: PaymentMethod) => React.ReactNode
}

export const PaymentSelector = ({
  onPaymentMethodChange,
  children,
}: PaymentSelectorProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('sol')

  const handleTabChange = (index: number) => {
    const method = index === 0 ? 'sol' : 'usdfc'
    setSelectedMethod(method)
    onPaymentMethodChange(method)
  }

  return (
    <VStack spacing="1.5em" align="stretch" w="full">
      <Tabs onChange={handleTabChange} variant="unstyled">
        <TabList
          gap="0.5em"
          p="0.25em"
          bg="var(--bg-dark)"
          border="1px solid var(--border-dark)"
          borderRadius="var(--radius-lg)"
        >
          <Tab
            flex="1"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-muted)"
            bg="transparent"
            borderRadius="var(--radius-md)"
            transition="all var(--transition-base)"
            _selected={{
              color: 'var(--eerie-black)',
              bg: 'var(--text-inverse)',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)',
            }}
            _hover={{
              color:
                selectedMethod === 'sol'
                  ? 'var(--eerie-black)'
                  : 'var(--text-inverse)',
              bg:
                selectedMethod === 'sol'
                  ? 'var(--text-inverse)'
                  : 'var(--border-hover)',
            }}
          >
            SOL
          </Tab>
          <Tab
            flex="1"
            fontSize="var(--font-size-sm)"
            fontWeight="var(--font-weight-semibold)"
            color="var(--text-muted)"
            bg="transparent"
            borderRadius="var(--radius-md)"
            transition="all var(--transition-base)"
            _selected={{
              color: 'var(--eerie-black)',
              bg: 'var(--text-inverse)',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)',
            }}
            _hover={{
              color:
                selectedMethod === 'usdfc'
                  ? 'var(--eerie-black)'
                  : 'var(--text-inverse)',
              bg:
                selectedMethod === 'usdfc'
                  ? 'var(--text-inverse)'
                  : 'var(--border-hover)',
            }}
          >
            USDFC
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} py="1em">
            {children('sol')}
          </TabPanel>
          <TabPanel px={0} py="1em">
            {children('usdfc')}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  )
}
