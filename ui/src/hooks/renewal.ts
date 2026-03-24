import { useAuthContext } from '@/hooks/context'
import { IS_DEV } from '@/lib/utils'
import { useUpload } from '@toju.network/sol'
import useSWR from 'swr'

export const useRenewalCost = (cid: string, duration: number) => {
  const { network } = useAuthContext()
  const client = useUpload(network, IS_DEV)
  const key = cid && duration ? ['renewal-cost', cid, duration, network] : null

  const { data, error, isLoading } = useSWR(key, async () => {
    const renewalCost = await client.getStorageRenewalCost(cid, duration)
    return renewalCost
  })

  return {
    data,
    error,
    isLoading,
  }
}
