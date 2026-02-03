import { createFileRoute } from '@tanstack/react-router'
import { Metrics } from '@/containers/app/metrics'

export const Route = createFileRoute('/_layout/app/metrics')({
  component: Metrics,
})
