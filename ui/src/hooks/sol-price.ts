import { useDeposit } from '@toju.network/sol'
import useSWR from 'swr'
import { useAuthContext } from '@/hooks/context'
import { IS_DEV } from '@/lib/utils'

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
