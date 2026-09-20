import type { DashboardStats, UploadedFile } from '@/lib/types'
import { getApiBase, getMeshkitGuestId } from '@/lib/meshkit-guest'
import useSWR from 'swr'

export function useUploadHistory() {
  const guestId = getMeshkitGuestId()
  const apiBase = getApiBase()

  const { data, error, isLoading, mutate } = useSWR(
    guestId ? ['upload-history-meshkit', guestId, apiBase] : null,
    async () => {
      const url = new URL(`${apiBase}/upload/history`)
      url.searchParams.set('userAddress', guestId)
      url.searchParams.set('page', '1')
      url.searchParams.set('limit', '50')
      url.searchParams.set('chain', 'mesh')

      const res = await fetch(url.toString())
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { message?: string }).message || 'Failed to load history',
        )
      }

      const historyData = await res.json()

      if (!historyData.data || historyData.data.length === 0) {
        return {
          files: [] as UploadedFile[],
          stats: {
            totalFiles: 0,
            totalStorage: 0,
            totalSpent: 0,
            activeFiles: 0,
          } satisfies DashboardStats,
        }
      }

      const transformedFiles: UploadedFile[] = historyData.data.map(
        (deposit: {
          id: number
          contentCid: string
          fileName?: string | null
          fileSize?: number | null
          fileType?: string | null
          url?: string
          createdAt: string
          transactionHash?: string | null
          durationDays: number
          depositAmount: number
          deletionStatus?: string | null
          expiresAt?: string | null
        }) => {
          let status: 'active' | 'expired' | 'pending' = 'active'
          if (deposit.deletionStatus === 'deleted') {
            status = 'expired'
          } else if (deposit.expiresAt) {
            const expirationDate = new Date(deposit.expiresAt)
            if (expirationDate < new Date()) status = 'expired'
          }

          return {
            id: deposit.id.toString(),
            cid: deposit.contentCid,
            filename: deposit.fileName || 'Unknown File',
            size: Number(deposit.fileSize) || 0,
            type: deposit.fileType || 'application/octet-stream',
            url: deposit.url || '',
            uploadedAt: deposit.createdAt,
            signature: deposit.transactionHash || '',
            duration: deposit.durationDays,
            cost: 0,
            status,
          }
        },
      )

      const totalStorage = transformedFiles.reduce((sum, f) => sum + f.size, 0)
      const activeFiles = transformedFiles.filter(
        (f) => f.status === 'active',
      ).length

      return {
        files: transformedFiles,
        stats: {
          totalFiles: transformedFiles.length,
          totalStorage,
          totalSpent: 0,
          activeFiles,
        } satisfies DashboardStats,
      }
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
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
