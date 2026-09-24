import { createFileRoute, redirect } from '@tanstack/react-router'

/** Sepolia payment path removed — MeshKit upload lives at /app */
export const Route = createFileRoute('/_layout/app/sepolia')({
  beforeLoad: () => {
    throw redirect({ to: '/app' })
  },
})
