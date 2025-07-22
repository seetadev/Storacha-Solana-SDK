import { estimateFees } from './payment';

export interface ClientOptions {
  /** Solana RPC endpoint to use for all chain interactions */
  rpcUrl?: string;
  /** server url for this client */
  serverUrl?: string;
}

type FeeEstimationParams = {
  /** size of the file in bytes */
  size: number;
  /** duration in days to store this data */
  durationDays: number;
};

export class Client {
  private rpcUrl: string;
  private serverUrl: string;

  constructor(options: ClientOptions = {}) {
    this.rpcUrl =
      options.rpcUrl ??
      'we should fallback to some rpc url here as mentioned in the spec';
    this.serverUrl = options.serverUrl ?? 'likewise here too';
  }

  /**
   * Estimate the cost in lamports to store a file of given size and duration.
   */
  async estimateFees(args: FeeEstimationParams): Promise<bigint> {
    return await estimateFees({
      ...args,
      rpcUrl: this.rpcUrl,
    });
  }
}
