import { Client, Environment } from './client';

export const useUpload = (environment: Environment) => {
  const client = new Client({ environment: environment || 'testnet' });
  return client;
};

/**
 * @deprecated Use {@link useUpload} instead.
 */
export { useUpload as useDeposit };
