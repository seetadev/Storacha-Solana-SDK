import { Upload } from '@/containers/app/upload'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/app/')({
  component: Upload,
})
