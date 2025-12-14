import { HomePage } from '@/containers/home'
import { HomeLayout } from '@/layouts/home'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout>
      <HomePage />
    </HomeLayout>
  )
}
