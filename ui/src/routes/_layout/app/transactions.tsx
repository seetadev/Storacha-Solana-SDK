import { Transactions } from '@/containers/app'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/app/transactions')({
  component: Transactions,
})
