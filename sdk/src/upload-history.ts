import { ServerOptions, UploadHistoryResponse } from './types';

/**
 * Get the upload history for a given user address from the server
 *
 * @param userAddress - The wallet address of the user
 * @param apiEndpoint - Base API URL
 * @param options - Optional server configuration and pagination options
 * @returns Promise<UploadHistoryResponse>
 *
 * @example
 * ```ts
 * const history = await getUserUploadHistory(
 *   '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
 *   API_BASE_URL,
 *   { page: 1, limit: 20 }
 * )
 *
 * console.log(history.data)
 * console.log(history.next)
 * ```
 *
 * @throws {Error} When the user address is invalid or the request fails
 */
export async function getUserUploadHistory(
  userAddress: string,
  apiEndpoint: string,
  options: ServerOptions & {
    page?: number;
    limit?: number;
  } = {}
): Promise<UploadHistoryResponse> {
  if (!userAddress || typeof userAddress !== 'string') {
    throw new Error('User address is required and must be a string');
  }

  const baseUrl = options.url || apiEndpoint;
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  try {
    const response = await fetch(
      `${baseUrl}/upload/history?userAddress=${encodeURIComponent(userAddress)}&page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch upload history: ${response.status} ${response.statusText}`
      );
    }

    const data: UploadHistoryResponse = await response.json();

    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray(data.data) ||
      typeof data !== 'object'
    ) {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching upload history');
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
