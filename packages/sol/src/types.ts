import { Address, Signature } from '@solana/kit'
import {
  Connection,
  PublicKey,
  Transaction as SolanaTransaction,
} from '@solana/web3.js'

export type PaymentChain = 'sol' | 'fil'
export type PaymentToken = 'SOL' | 'USDFC'

export interface ServerOptions {
  /** URL pointing to the server (mostly Storacha's) */
  url?: string
}

/**
 * Options needed to create an on-chain deposit for storage
 */
export interface UploadOptions {
  /** content identifier for the data to be uploaded */
  cid: string
  /** file/upload size in bytes */
  size: number
  /** duration in days for how long the data should be retained */
  duration: number
  /** wallet responsible for paying the deposit */
  payer: Address
  /** optional Solana connection override (for testing or custom RPC) */
  connection?: any
  /** Signature or transaction hash as proof of on-chain deposit */
  signature?: string
}

/**
 * Result returned after a successful file upload
 */
export interface UploadResult {
  /** message from the deposit transaction. could be an error or success message */
  message?: string
  /** similar to message above  but for error cases. can extrapoloate this later */
  error?: string
  /** signature of the succesful transaction */
  signature: Signature
  /** status of the request. successful or not. */
  success: boolean
  /** CID of the uploaded content */
  cid: string
  /** full URL where the content was uploaded to (on IPFS) */
  url: string
  /** information of the file that was uploaded */
  fileInfo?: {
    /** file type */
    type: string
    /** size of the uploaded content (in bytes) */
    size: number
    /** UNIX timestamp (in seconds) of the time the file was uploaded */
    uploadedAt: string
    /** name of the file uploaded */
    filename: string
  }
}

/**
 * Stored item entry returned when listing wallet space
 */
export interface WalletItem {
  /** CID of the stored item */
  cid: string
  /** file size in bytes */
  size: number
  /** expiration timestamp in seconds */
  expiresAt: number
}

/**
 * Config values fetched from the on-chain ConfigAccount
 */
export interface OnChainConfig {
  /** current rate in lamports per byte per day */
  ratePerBytePerDay: bigint
  /** minimum required duration in days */
  minDurationDays: number
  /** wallet where provider can withdraw claimed funds */
  withdrawalWallet: Address
}

/**
 * Deposit details stored on-chain for each user upload
 */
export interface OnChainDeposit {
  /** public key of the depositor */
  depositor: Address
  /** file object containing metadata about the upload */
  file: File[]
  /** storage duration (days) */
  duration: number
  /** amount deposited in lamports */
  depositAmount: bigint
  /** slot when deposit was made */
  depositSlot: number
  /** last claimed slot for reward release */
  lastClaimedSlot: number
}

export interface DepositResult extends Pick<UploadResult, 'message' | 'error'> {
  /** CID of the stored item */
  cid: string
  /** transaction instruction */
  instructions: Array<{
    programId: string
    keys: Array<{
      pubkey: string
      isSigner: boolean
      isWritable: boolean
    }>
    data: string
  }>
  /** result of a successful upload */
  object: UploadResult
  /** metadata needed for DB insertion after transaction confirmation */
  depositMetadata?: {
    depositAmount: number
    durationDays: number
    depositKey: string
    userEmail: string | null
    fileName: string | null
    fileType: string
    fileSize: number
    expiresAt: string
  }
}

export interface CreateDepositArgs
  extends Omit<
    OnChainDeposit,
    'depositAmount' | 'depositor' | 'depositSlot' | 'lastClaimedSlot'
  > {
  /** Public key of the user paying for the upload */
  payer: PublicKey
  /** Wallet connection used to query chain state or recent blockhash */
  connection: Connection
  /**
   * a callback function to authorize the transaction via the solana wallet lib
   * @example
   * const {publickKey, signTransaction} = useSolanaWallet()
   * const signTransaction = await signTransaction(tx)
   * */
  signTransaction: (tx: SolanaTransaction) => Promise<SolanaTransaction>
  /** Optional user email for expiration notifications */
  userEmail?: string
}

/** Arguments for renewing storage duration */
export interface StorageRenewalParams
  extends Pick<CreateDepositArgs, 'payer' | 'signTransaction'> {
  /** Content identifier of the uploaded data to be renewed */
  cid: string
  /** Duration in days to extend storage */
  duration: number
}

/** Internal arguments for renewStorageTxn */
export interface RenewStorageDurationArgs
  extends Pick<CreateDepositArgs, 'payer' | 'signTransaction' | 'connection'> {
  /** Content identifier of the uploaded data to be renewed */
  cid: string
  /** Duration in days to extend storage */
  duration: number
}

/**
 * Transaction record for an upload (initial deposit or renewal)
 */
export interface Transaction {
  /** Unique identifier for the transaction */
  id: number
  /** ID of the associated deposit */
  depositId: number
  /** Content identifier of the upload */
  contentCid: string
  /** Solana transaction hash */
  transactionHash: string
  /** Type of transaction: 'initial_deposit' | 'renewal' */
  transactionType: string
  /** Amount paid in lamports */
  amountInLamports: number
  /** Duration in days purchased */
  durationDays: number
  /** Timestamp when the transaction was created */
  createdAt: string
}

/**
 * Individual upload history entry from the server
 */
export interface UploadHistory {
  /** Unique identifier for the deposit */
  id: number
  /** User's wallet address (deposit key) */
  depositKey: string
  /** Content identifier of the uploaded file */
  contentCid: string
  /** Duration in days the file is stored for */
  durationDays: number
  /** Amount deposited in lamports */
  depositAmount: number
  /** Slot when the deposit was made */
  depositSlot: number
  /** Last slot when rewards were claimed */
  lastClaimedSlot: number
  /** Timestamp when the deposit was created */
  createdAt: string
  /** Expiration date of the upload */
  expiresAt?: string
  /** User email for notifications */
  userEmail?: string
  /** Name of the uploaded file */
  fileName?: string
  /** MIME type of the file */
  fileType?: string
  /** Size of the file in bytes */
  fileSize?: number
  /** Solana transaction hash */
  transactionHash?: string
  /** Deletion status: 'active' | 'warned' | 'deleted' */
  deletionStatus?: string
  /** Timestamp when warning email was sent */
  warningSentAt?: string
  /** Optional array of all transactions for this upload */
  transactions?: Transaction[]
}

/**
 * @deprecated Use UploadHistory instead
 */
export type DepositHistoryEntry = UploadHistory

export interface PaginationMeta {
  /** Total number of records */
  total: number
  /** Current page (1-indexed) */
  page: number
  /** Page size */
  pageSize: number
  /** Total number of pages */
  totalPages: number
  /** URL to fetch next page */
  next: string | null
  /** URL to fetch previous page */
  prev: string | null
}

/**
 * Response from the getUserUploadHistory endpoint
 */
export interface UploadHistoryResponse extends PaginationMeta {
  /** Array of upload history entries */
  data: UploadHistory[] | null
  /** The user address that was queried */
  userAddress: string
}

/**
 * @deprecated Use UploadHistoryResponse instead
 */
export type DepositHistoryResponse = UploadHistoryResponse

/**
 * Storage renewal cost estimation
 */
export type StorageRenewalCost = {
  /** New expiration date after renewal */
  newExpirationDate: string
  /** Current expiration date before renewal */
  currentExpirationDate: string
  /** Number of additional days being added */
  additionalDays: string
  /** Cost of renewal in lamports */
  costInLamports: number
  /** Cost of renewal in SOL */
  costInSOL: number
  /** Details about the file being renewed */
  fileDetails: {
    /** Content identifier */
    cid: string
    /** Name of the file */
    fileName: string
    /** Size of the file in bytes */
    fileSize: number
  }
}

/**
 * Storage renewal transaction result
 */
export type StorageRenewalResult = {
  /** Content identifier of the uploaded data to be renewed */
  cid: string
  /** Status message about the renewal */
  message: string
  /** Transaction instructions for the user to sign */
  instructions: Array<{
    programId: string
    keys: Array<{
      pubkey: string
      isSigner: boolean
      isWritable: boolean
    }>
    data: string
  }>
  /** Number of additional days being added */
  duration: number
  /** Cost breakdown for the renewal */
  cost: {
    /** Cost in lamports */
    lamports: number
    /** Cost in SOL */
    sol: number
  }
}
