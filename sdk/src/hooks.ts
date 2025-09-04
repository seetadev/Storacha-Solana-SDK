import { Client, ClientOptions } from './client';

export const useDeposit = (environment: ClientOptions['environment']) => {
  const client = new Client({ environment: environment || 'testnet' });
  return client;
};
