import { useAuthContext } from '@/hooks/context'
import { IS_DEV } from '@/lib/utils'
import { useDeposit } from '@toju.network/sol'
import useSWR from 'swr'

export const useSolPrice = () => {
  const { network } = useAuthContext()
  const client = useDeposit(network, IS_DEV)

  const { data, error, isLoading } = useSWR(
    ['sol-price', network],
    async () => {
      return await client.getSolPrice()
    },
  )

  return {
    price: data ?? null,
    error,
    isLoading,
  }
}
