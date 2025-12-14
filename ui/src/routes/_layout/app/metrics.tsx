import { Box, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

const MetricsPageComponent = () => {
  return (
    <Box>
      <Heading as="h1" size="lg" mb="1em">Metrics</Heading>
      <p>User metrics will be displayed here.</p>
    </Box>
  )
}

export const Route = createFileRoute('/_layout/app/metrics')({
  component: MetricsPageComponent,
})
