import { Box, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

const HistoryPageComponent = () => {
  return (
    <Box>
      <Heading as="h1" size="lg" mb="1em">History</Heading>
      <p>File upload history will be displayed here.</p>
    </Box>
  )
}

export const Route = createFileRoute('/_layout/app/history')({
  component: HistoryPageComponent,
})
