import { createFileRoute } from '@tanstack/react-router'
import { Transactions } from '@/containers/app'

export const Route = createFileRoute('/_layout/app/transactions')({
  component: Transactions,
})
