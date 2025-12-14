import { UploadHistory } from '@/containers/app'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/app/history')({
  component: UploadHistory,
})
