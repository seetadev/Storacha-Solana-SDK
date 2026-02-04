import { Client, Environment } from './client'

export const useUpload = (
  environment: Environment,
  endpoint?: string,
  rpcUrl?: string,
) => {
  const client = new Client({
    environment: environment || 'testnet',
    ...(endpoint && { endpoint }),
    ...(rpcUrl && { rpcUrl }),
  })
  return client
}

/**
 * @deprecated Use {@link useUpload} instead.
 */
export { useUpload as useDeposit }
