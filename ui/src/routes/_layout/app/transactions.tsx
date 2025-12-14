import { Box, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

const TransactionsPageComponent = () => {
  return (
    <Box>
      <Heading as="h1" size="lg" mb="1em">Transactions</Heading>
      <p>Payment transactions will be displayed here.</p>
    </Box>
  )
}

export const Route = createFileRoute('/_layout/app/transactions')({
  component: TransactionsPageComponent,
})
