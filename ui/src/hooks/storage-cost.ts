import { useDeposit } from '@toju.network/sol'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useAuthContext } from '@/hooks/context'
import { IS_DEV } from '@/lib/utils'

export const useStorageCost = (files: Array<File>, durationDays: number) => {
  const { network } = useAuthContext()
  const client = useDeposit(network, IS_DEV)
  const [duration, setDuration] = useState(durationDays)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDuration(durationDays)
    }, 800)

    return () => clearTimeout(timer)
  }, [durationDays])

  const key =
    files.length > 0
      ? [
          'storage-cost',
          network,
          files.map((f) => `${f.name}-${f.size}`).join(','),
          duration,
        ]
      : null

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const durationInSeconds = duration * 86400
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
