import { Client, ClientOptions } from './client';

export const useUpload = (environment: ClientOptions['environment']) => {
  const client = new Client({ environment: environment || 'testnet' });
  return client;
};

/**
 * @deprecated Use {@link useUpload} instead.
 */
export { useUpload as useDposit };
