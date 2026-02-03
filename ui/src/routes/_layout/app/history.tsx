import { createFileRoute } from '@tanstack/react-router'
import { UploadHistory } from '@/containers/app'

export const Route = createFileRoute('/_layout/app/history')({
  component: UploadHistory,
})
