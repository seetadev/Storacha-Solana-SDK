import { ServerOptions, UploadHistoryResponse } from './types';

/**
 * Get the upload history for a given user address from the server
 *
 * @param userAddress - The wallet address of the user to fetch upload history for
 * @param options - Optional server configuration and pagination options
 * @returns Promise<UploadHistoryResponse> - The user's upload history
 *
 * @example
 * ```typescript
 * const history = await getUserUploadHistory('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
 * console.log('User upload history:', history.userHistory);
 * ```
 *
 * @throws {Error} When the user address is invalid or the request fails
 */
export async function getUserUploadHistory(
  userAddress: string,
  apiEndpoint: string,
  options: ServerOptions & {
    page?: number
    limit?: number
  } = {}
): Promise<UploadHistoryResponse> {
  if (!userAddress || typeof userAddress !== 'string') {
    throw new Error('User address is required and must be a string')
  }

  const baseUrl = options.url || apiEndpoint
  const page = options.page ?? 1
  const limit = options.limit ?? 20

  try {
    const response = await fetch(
      `${baseUrl}/api/upload/history` +
        `?userAddress=${encodeURIComponent(userAddress)}` +
        `&page=${page}` +
        `&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message ||
          `Failed to fetch upload history: ${response.status} ${response.statusText}`
      )
    }

    const data: UploadHistoryResponse = await response.json()

    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray(data.userHistory) ||
      typeof data.pagination !== 'object'
    ) {
      throw new Error('Invalid response format from server')
    }

    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching upload history')
  }
}


/**
 * @deprecated Use getUserUploadHistory instead
 */
export { getUserUploadHistory as fetchUserUploadHistory };

/**
 * @deprecated Use getUserUploadHistory instead
 */
export { getUserUploadHistory as fetchUserDepositHistory };
