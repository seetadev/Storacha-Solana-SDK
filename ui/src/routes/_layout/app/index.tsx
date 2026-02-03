import { createFileRoute } from '@tanstack/react-router'
import { Upload } from '@/containers/app/upload'

export const Route = createFileRoute('/_layout/app/')({
  component: Upload,
})
