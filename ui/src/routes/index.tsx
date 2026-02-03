import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/containers/home'
import { HomeLayout } from '@/layouts/home'

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
