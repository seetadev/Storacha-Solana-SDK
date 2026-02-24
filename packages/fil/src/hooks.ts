import { Client, Environment } from './client'

export const useUpload = (
  environment: Environment,
  rpcUrl: string,
  endpoint?: string,
) => {
  const client = new Client({
    environment: environment || 'calibration',
    ...(endpoint && { endpoint }),
    ...(rpcUrl && { rpcUrl }),
  })
  return client
}
