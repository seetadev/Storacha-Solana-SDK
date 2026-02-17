import { useAuthContext } from '@/hooks/context'
import { IS_DEV } from '@/lib/utils'
import { Environment, useUpload as useFilUpload } from '@toju.network/fil'
import { useDeposit } from '@toju.network/sol'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

const getFilEnvironment = (): Environment => {
  const network = import.meta.env.VITE_FILECOIN_NETWORK || 'calibration'
  return network === 'mainnet' ? Environment.mainnet : Environment.calibration
}

const useDebouncedDuration = (durationDays: number) => {
  const [duration, setDuration] = useState(durationDays)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDuration(durationDays)
    }, 800)

    return () => clearTimeout(timer)
  }, [durationDays])

  return duration
}

const createCacheKey = (
  prefix: string,
  files: Array<File>,
  duration: number,
  extras?: Array<string>,
) => {
  if (files.length === 0) return null
  return [
    prefix,
    ...(extras || []),
    files.map((f) => `${f.name}-${f.size}`).join(','),
    duration,
  ]
}

export const useStorageCost = (files: Array<File>, durationDays: number) => {
  const { network } = useAuthContext()
  const client = useDeposit(network, IS_DEV)
  const duration = useDebouncedDuration(durationDays)

  const key = createCacheKey('storage-cost', files, duration, [String(network)])

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

export const useUsdfcStorageCost = (
  files: Array<File>,
  durationDays: number,
) => {
  const environment = getFilEnvironment()
  const client = useFilUpload(
    environment,
    IS_DEV ? import.meta.env.VITE_API_URL : undefined,
  )
  const duration = useDebouncedDuration(durationDays)
  const key = createCacheKey('usdfc-storage-cost', files, duration)

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      return await client.estimateStorageCost(files, duration)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  return {
    totalCost: data?.usdfc ? Number(data.usdfc) : 0,
    isLoading,
    error,
  }
}
