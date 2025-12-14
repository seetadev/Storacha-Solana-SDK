import { useAuthContext } from '@/hooks/context'
import type { DashboardStats, UploadedFile } from '@/lib/types'
import { useDeposit } from 'storacha-sol'
import useSWR from 'swr'

export function useUploadHistory() {
  const { user, network } = useAuthContext()
  const client = useDeposit(network)

  const { data, error, isLoading, mutate } = useSWR(
    user ? ['upload-history', user, network] : null,
    async () => {
      if (!user) return null

      const data = await client.getUserUploadHistory(user)

      if (!data.userHistory || data.userHistory.length === 0) {
        return {
          files: [],
          stats: {
            totalFiles: 0,
            totalStorage: 0,
            totalSpent: 0,
            activeFiles: 0,
          },
        }
      }

      const transformedFiles: UploadedFile[] = data.userHistory.map(
        (deposit) => {
          let status: 'active' | 'expired' | 'pending' = 'active'
          if (deposit.deletionStatus === 'deleted') {
            status = 'expired'
          } else if (deposit.expiresAt) {
            const expirationDate = new Date(deposit.expiresAt)
            const now = new Date()
            if (expirationDate < now) {
              status = 'expired'
            } else if (deposit.deletionStatus === 'warned') {
              status = 'active'
            }
          }

          return {
            id: deposit.id.toString(),
            cid: deposit.contentCid,
            filename: deposit.fileName || 'Unknown File',
            size: Number(deposit.fileSize) || 0,
            type: deposit.fileType || 'application/octet-stream',
            url: `https://w3s.link/ipfs/${deposit.contentCid}${deposit.fileName ? `/${deposit.fileName}` : ''}`,
            uploadedAt: deposit.createdAt,
            signature: deposit.transactionHash || '',
            duration: deposit.durationDays,
            cost: Number(deposit.depositAmount) / 1_000_000_000,
            status,
          }
        },
      )

      const totalStorage = transformedFiles.reduce(
        (sum, file) => sum + file.size,
        0,
      )
      const totalSpent = transformedFiles.reduce(
        (sum, file) => sum + file.cost,
        0,
      )
      const activeFiles = transformedFiles.filter(
        (file) => file.status === 'active',
      ).length

      const stats: DashboardStats = {
        totalFiles: transformedFiles.length,
        totalStorage,
        totalSpent,
        activeFiles,
      }

      return {
        files: transformedFiles,
        stats,
      }
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    },
  )

  return {
    files: data?.files || [],
    stats: data?.stats || {
      totalFiles: 0,
      totalStorage: 0,
      totalSpent: 0,
      activeFiles: 0,
    },
    isLoading,
    error,
    refetch: mutate,
  }
}
