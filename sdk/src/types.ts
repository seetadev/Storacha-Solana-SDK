import { Address } from '@solana/kit';
import { Connection, PublicKey } from '@solana/web3.js';
import { CID } from 'multiformats';

export type FeeEstimationArgs = {
  /** size of the file in bytes */
  size: number;
  /** duration in days to store this data */
  durationDays: number;
  /** rpc url for connecting to the Solana network */
  rpcUrl?: string;
};

export interface ServerOptions {
  /** URL pointing to the backend (mostly Storacha's) */
  url?: string
}

/**
 * Options needed to create an on-chain deposit for storage
 */
export interface UploadOptions {
  /** content identifier for the data to be uploaded */
  cid: CID;
  /** file/upload size in bytes */
  size: number;
  /** duration in days for how long the data should be retained */
  duration: number;
  /** wallet responsible for paying the deposit */
  payer: Address;
  /** optional Solana connection override (for testing or custom RPC) */
  connection?: any;
  /** Signature or transaction hash as proof of on-chain deposit */
  signature?: string
}

/**
 * Result returned after a successful file upload
 */
export interface UploadResult {
  /** CID of the uploaded content */
  cid: CID;
  /** full URL where the content was uploaded to */
  url: string;
  /** size of the uploaded content (in bytes) */
  size: number;
  /** UNIX timestamp (in seconds) when the storage expires */
  expiresAt: number;
}

/**
 * Stored item entry returned when listing wallet space
 */
export interface WalletItem {
  /** CID of the stored item */
  cid: CID;
  /** file size in bytes */
  size: number;
  /** expiration timestamp in seconds */
  expiresAt: number;
}

/**
 * Config values fetched from the on-chain ConfigAccount
 */
export interface OnChainConfig {
  /** current rate in lamports per byte per day */
  ratePerBytePerDay: bigint;
  /** minimum required duration in days */
  minDurationDays: number;
  /** wallet where provider can withdraw claimed funds */
  withdrawalWallet: Address;
}

/**
 * Deposit details stored on-chain for each user upload
 */
export interface OnChainDeposit {
  /** public key of the depositor */
  depositor: Address;
  /** CID for the content paid for */
  cid: CID;
  /** size of the content (bytes) */
  size: number;
  /** storage duration (days) */
  duration: number;
  /** amount deposited in lamports */
  depositAmount: bigint;
  /** slot when deposit was made */
  depositSlot: number;
  /** last claimed slot for reward release */
  lastClaimedSlot: number;
}

export interface CreateDepositArgs
  extends Omit<
    OnChainDeposit,
    'depositAmount' | 'depositor' | 'depositSlot' | 'lastClaimedSlot'
  > {
  /** Public key of the user paying for the upload */
  payer: PublicKey;
  /** Wallet connection used to query chain state or recent blockhash */
  connection: Connection;
}
