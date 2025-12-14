import { Metrics } from '@/containers/app/metrics'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/app/metrics')({
  component: Metrics,
})
