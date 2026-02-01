import { Client, Environment } from './client';

export const useUpload = (environment: Environment, endpoint?: string) => {
  const client = new Client({
    environment: environment || 'testnet',
    ...(endpoint && { endpoint }),
  });
  return client;
};

/**
 * @deprecated Use {@link useUpload} instead.
 */
export { useUpload as useDeposit };
