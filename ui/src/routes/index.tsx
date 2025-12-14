import { Center, Stack, Text } from '@chakra-ui/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '@/layouts/home'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout>
      <Center height="100vh">
        <Stack gap="1em" textAlign="center">
          <Text fontWeight="600" fontSize="24px">
            Hello keep
          </Text>
          <Link to="/connect">
            <Text cursor="pointer" fontSize="14px">
              connect wallet
            </Text>
          </Link>
        </Stack>
      </Center>
    </HomeLayout>
  )
}
