import { useDeposit as useSolDeposit } from '@toju.network/sol'
import { Environment as FilEnvironment, useUpload as useFilDeposit } from '@toju.network/fil'
import useSWR from 'swr'
import { useAuthContext, useChainContext } from '@/hooks/context'
import type { DashboardStats, UploadedFile } from '@/lib/types'
import { IS_DEV } from '@/lib/utils'
import { useConnection } from 'wagmi'

export function useUploadHistory() {
  const { user: solAddress, network } = useAuthContext()
  const { address: filAddress } = useConnection()
  
  const { selectedChain } = useChainContext()

  const currentUserAddress = selectedChain === 'sol' ? solAddress : filAddress

  const client = selectedChain === 'sol' 
    ? useSolDeposit(network) 
    : useFilDeposit(
        import.meta.env.VITE_FILECOIN_NETWORK === 'mainnet' ? FilEnvironment.mainnet : FilEnvironment.calibration,
        IS_DEV ? import.meta.env.VITE_API_URL : undefined as any
      )

  const { data, error, isLoading, mutate } = useSWR(
    currentUserAddress ? ['upload-history', currentUserAddress, network, selectedChain] : null,
    async () => {
      if (!currentUserAddress) return null

      const historyData = await client.getUserUploadHistory(currentUserAddress, 1, 20)

      if (!historyData.data || historyData.data.length === 0) {
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

      const transformedFiles: Array<UploadedFile> = historyData.data.map(
        (deposit: any) => {
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
