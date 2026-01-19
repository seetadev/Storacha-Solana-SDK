import { useAuthContext } from '@/hooks/context'
import { useDeposit } from '@toju.network/sol'
import useSWR from 'swr'

export const useStorageCost = (files: Array<File>, durationDays: number) => {
  const { network } = useAuthContext()
  const client = useDeposit(network)

  const key =
    files.length > 0
      ? [
          'storage-cost',
          network,
          files.map((f) => `${f.name}-${f.size}`).join(','),
          durationDays,
        ]
      : null

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const durationInSeconds = durationDays * 86400
      return await client.estimateStorageCost(files, durationInSeconds)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  return {
    cost: data?.sol ?? 0,
    totalCost: data?.sol ?? 0,
    isLoading,
    error,
  }
}
