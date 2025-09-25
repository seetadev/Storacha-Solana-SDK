import { Address, Signature } from '@solana/kit';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export interface ServerOptions {
  /** URL pointing to the backend (mostly Storacha's) */
  url?: string;
}

/**
 * Options needed to create an on-chain deposit for storage
 */
export interface UploadOptions {
  /** content identifier for the data to be uploaded */
  cid: string;
  /** file/upload size in bytes */
  size: number;
  /** duration in days for how long the data should be retained */
  duration: number;
  /** wallet responsible for paying the deposit */
  payer: Address;
  /** optional Solana connection override (for testing or custom RPC) */
  connection?: any;
  /** Signature or transaction hash as proof of on-chain deposit */
  signature?: string;
}

/**
 * Result returned after a successful file upload
 */
export interface UploadResult {
  /** message from the deposit transaction. could be an error or success message */
  message?: string;
  /** similar to message above  but for error cases. can extrapoloate this later */
  error?: string;
  /** signature of the succesful transaction */
  signature: Signature;
  /** status of the request. successful or not. */
  success: boolean;
  /** CID of the uploaded content */
  cid: string;
  /** full URL where the content was uploaded to (on IPFS) */
  url: string;
  /** information of the file that was uploaded */
  fileInfo?: {
    /** file type */
    type: string;
    /** size of the uploaded content (in bytes) */
    size: number;
    /** UNIX timestamp (in seconds) of the time the file was uploaded */
    uploadedAt: string;
    /** name of the file uploaded */
    filename: string;
  };
}

/**
 * Stored item entry returned when listing wallet space
 */
export interface WalletItem {
  /** CID of the stored item */
  cid: string;
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
  /** file object containing metadata about the upload */
  file: File[];
  /** storage duration (days) */
  duration: number;
  /** amount deposited in lamports */
  depositAmount: bigint;
  /** slot when deposit was made */
  depositSlot: number;
  /** last claimed slot for reward release */
  lastClaimedSlot: number;
}

export interface DepositResult extends Pick<UploadResult, 'message' | 'error'> {
  /** CID of the stored item */
  cid: string;
  /** transaction instruction */
  instructions: Array<{
    programId: string;
    keys: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  /** result of a successful upload */
  object: UploadResult;
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
  /**
   * a callback function to authorize the transaction via the solana wallet lib
   * @example
   * const {publickKey, signTransaction} = useSolanaWallet()
   * const signTransaction = await signTransaction(tx)
   * */
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  /** indicate whether you to upload a single file or multiple files in a directory */
  multiple: boolean
}

/**
 * Individual deposit history entry from the backend
 */
export interface DepositHistoryEntry {
  /** Unique identifier for the deposit */
  id: number;
  /** User's wallet address (deposit key) */
  deposit_key: string;
  /** Content identifier of the uploaded file */
  content_cid: string;
  /** Duration in days the file is stored for */
  duration_days: number;
  /** Amount deposited in lamports */
  deposit_amount: number;
  /** Slot when the deposit was made */
  deposit_slot: number;
  /** Last slot when rewards were claimed */
  last_claimed_slot: number;
  /** Timestamp when the deposit was created */
  created_at: string;
}

/**
 * Response from the getUserUploadHistory endpoint
 */
export interface DepositHistoryResponse {
  /** Array of deposit history entries */
  userHistory: DepositHistoryEntry[] | null;
  /** The user address that was queried */
  userAddress: string;
}
