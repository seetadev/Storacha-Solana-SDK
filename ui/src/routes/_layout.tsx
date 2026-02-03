import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/layouts/app'

export const Route = createFileRoute('/_layout')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
