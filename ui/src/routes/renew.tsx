import { Renew } from '@/containers/app'
import { HomeLayout } from '@/layouts/home'
import { Center } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

const StorageRenewal = () => {
  return (
    <HomeLayout>
      <Center height="fit-content" my="2em" px="auto">
        <Renew />
      </Center>
    </HomeLayout>
  )
}

export const Route = createFileRoute('/renew')({
  component: StorageRenewal,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      cids: (search.cids as string) || ''
    }
  },
})
