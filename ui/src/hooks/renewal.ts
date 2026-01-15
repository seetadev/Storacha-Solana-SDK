import { useAuthContext } from '@/hooks/context'
import { useUpload } from 'storacha-sol'
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

export const useExpiringUploads = (
  walletAddress: string,
  cids?: string[],
) => {
  const { network } = useAuthContext()
  const client = useUpload(network)
  const key = walletAddress ? ['expiring-uploads', walletAddress, network] : null

  const { data, error, isLoading } = useSWR(key, async () => {
    const response = await client.getUserUploadHistory(walletAddress)
    const history = response.userHistory || []
    const now = new Date()
    const cidSet = new Set(cids?.filter(Boolean))

    return history
      .filter((file: any) => {
        if (!file.expiresAt || file.deletionStatus === 'deleted') return false
        if (cidSet.size > 0 && !cidSet.has(file.contentCid)) return false
        const expiresAt = new Date(file.expiresAt)
        const daysRemaining = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        return daysRemaining >= 0 && daysRemaining <= 7
      })
      .map((file: any) => {
        const expiresAt = new Date(file.expiresAt)
        const daysRemaining = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        return {
          id: file.id,
          contentCid: file.contentCid,
          fileName: file.fileName || 'Unknown File',
          fileSize: file.fileSize,
          expiresAt: file.expiresAt,
          daysRemaining,
          deletionStatus: file.deletionStatus,
        }
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
      )
  })

  return {
    data: data || [],
    error,
    isLoading,
  }
}
