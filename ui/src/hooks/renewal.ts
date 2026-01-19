import { useAuthContext } from '@/hooks/context'
import { useUpload } from '@toju.network/sol'
import useSWR from 'swr'

export const useRenewalCost = (cid: string, duration: number) => {
  const { network } = useAuthContext()
  const client = useUpload(network)
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

export const useFileDetails = (walletAddress: string, cid: string) => {
  const { network } = useAuthContext()
  const client = useUpload(network)
  const key =
    walletAddress && cid ? ['file-details', walletAddress, cid, network] : null

  const { data, error, isLoading } = useSWR(key, async () => {
    const response = await client.getUserUploadHistory(walletAddress)
    const file = response.userHistory?.find((f: any) => f.contentCid === cid)

    if (!file) {
      throw new Error('File not found in your upload history')
    }

    if (file.deletionStatus === 'deleted') {
      throw new Error('This file has been deleted and cannot be renewed')
    }

    return file
  })

  return {
    data,
    error,
    isLoading,
  }
}
