import { ServerOptions, UploadHistoryResponse } from './types';

/**
 * Get the upload history for a given user address from the server
 *
 * @param userAddress - The wallet address of the user to fetch upload history for
 * @param options - Optional server configuration
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
  options: ServerOptions = {}
): Promise<UploadHistoryResponse> {
  // Validate user address
  if (!userAddress || typeof userAddress !== 'string') {
    throw new Error('User address is required and must be a string');
  }

  // Use provided apiEndpoint, or allow override via options
  const baseUrl = options.url || apiEndpoint;

  try {
    const response = await fetch(
      `${baseUrl}/api/user/user-upload-history?userAddress=${encodeURIComponent(userAddress)}`,
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

    // Validate response structure
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid response format from server');
    }

    if (typeof data.userAddress !== 'string') {
      throw new Error('Invalid userAddress in response');
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
