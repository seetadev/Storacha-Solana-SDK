/**
 * TODO:
 * Solana-specific Address / Signature removed.
 * Replace with Filecoin address + message CID types.
 */
export type ChainAddress = string
export type ChainSignature = string

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
  payer: ChainAddress
  /**
   * TODO:
   * Replace Solana Connection with Filecoin provider / lotus client
   */
  connection?: any
  /** Message CID / transaction hash as proof of on-chain deposit */
  signature?: ChainSignature
}

/**
 * Result returned after a successful file upload
 */
export interface UploadResult {
  /** message from the deposit transaction */
  message?: string
  /** error message if upload fails */
  error?: string
  /** Filecoin message CID (previously Solana signature) */
  signature: ChainSignature
  /** status of the request */
  success: boolean
  /** CID of the uploaded content */
  cid: string
  /** full URL where the content was uploaded to */
  url: string
  /** information of the file that was uploaded */
  fileInfo?: {
    type: string
    size: number
    uploadedAt: string
    filename: string
  }
}

/**
 * Stored item entry returned when listing wallet space
 */
export interface WalletItem {
  cid: string
  size: number
  expiresAt: number
}

/**
 * TODO:
 * Previously derived from Solana on-chain config account.
 * Replace with Filecoin deal / storage config.
 */
export interface OnChainConfig {
  /** rate per byte per day (attoFIL or equivalent) */
  ratePerBytePerDay: bigint
  minDurationDays: number
  /** Filecoin payout address */
  withdrawalWallet: ChainAddress
}

/**
 * Deposit details stored on-chain for each user upload
 */
export interface OnChainDeposit {
  depositor: ChainAddress
  file: File[]
  duration: number
  /** amount deposited (attoFIL) */
  depositAmount: bigint
  /** chain-specific block / epoch */
  depositEpoch: number
  lastClaimedEpoch: number
}

export interface DepositResult extends Pick<UploadResult, 'message' | 'error'> {
  cid: string

  /**
   * TODO:
   * Instructions are currently Solana-based.
   * Replace with Filecoin message params.
   */
  instructions: Array<{
    programId: string
    keys: Array<{
      pubkey: string
      isSigner: boolean
      isWritable: boolean
    }>
    data: string
  }>

  object: UploadResult

  /** metadata needed for DB insertion after confirmation */
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

/**
 * Arguments required to create a deposit
 */
export interface CreateDepositArgs
  extends Omit<
    OnChainDeposit,
    'depositAmount' | 'depositor' | 'depositEpoch' | 'lastClaimedEpoch'
  > {
  /** Filecoin address paying for the upload */
  payer: ChainAddress

  /**
   * TODO:
   * Replace Solana connection with Filecoin provider
   */
  connection: any

  /**
   * TODO:
   * Replace Solana transaction signing with Filecoin message signing
   *
   * Expected to return a signed message CID
   */
  signTransaction: (payload: any) => Promise<{ messageCid: ChainSignature }>

  userEmail?: string
}

/**
 * Arguments for renewing storage duration
 */
export interface StorageRenewalParams
  extends Pick<CreateDepositArgs, 'payer' | 'signTransaction'> {
  cid: string
  duration: number
}

/**
 * Internal arguments for renewStorageTxn
 */
export interface RenewStorageDurationArgs
  extends Pick<CreateDepositArgs, 'payer' | 'signTransaction' | 'connection'> {
  cid: string
  duration: number
}

/**
 * Transaction record for an upload (deposit or renewal)
 */
export interface Transaction {
  id: number
  depositId: number
  contentCid: string
  /** Filecoin message CID */
  transactionHash: string
  /** 'initial_deposit' | 'renewal' */
  transactionType: string
  /** amount paid (attoFIL) */
  amountInSmallestUnit: number
  durationDays: number
  createdAt: string
}

/**
 * Individual upload history entry from the server
 */
export interface UploadHistory {
  id: number
  depositKey: string
  contentCid: string
  durationDays: number
  depositAmount: number
  depositEpoch: number
  lastClaimedEpoch: number
  createdAt: string
  expiresAt?: string
  userEmail?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  transactionHash?: string
  deletionStatus?: string
  warningSentAt?: string
  transactions?: Transaction[]
}

/**
 * @deprecated Use UploadHistory instead
 */
export type DepositHistoryEntry = UploadHistory

export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  next: string | null
  prev: string | null
}

export interface UploadHistoryResponse extends PaginationMeta {
  data: UploadHistory[] | null
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
  newExpirationDate: string
  currentExpirationDate: string
  additionalDays: string
  /** cost in smallest unit (attoFIL) */
  costInSmallestUnit: number
  /** cost in FIL */
  costInToken: number
  fileDetails: {
    cid: string
    fileName: string
    fileSize: number
  }
}

/**
 * Storage renewal transaction result
 */
export type StorageRenewalResult = {
  cid: string
  message: string

  /**
   * TODO:
   * Replace Solana instructions with Filecoin message params
   */
  instructions: Array<any>

  duration: number
  cost: {
    smallestUnit: number
    token: number
  }
}
