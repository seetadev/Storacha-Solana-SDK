import { useAuthContext } from '@/hooks/context'
import { useDeposit } from 'storacha-sol'
import useSWR from 'swr'

export const useSolPrice = () => {
  const { network } = useAuthContext()
  const client = useDeposit(network)

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
