export type PaymentChain = 'sol' | 'fil'
export type PaymentToken = 'SOL' | 'USDFC' | 'FIL'

/**
 * Result returned after a successful file upload with USDFC payment
 */
export interface UploadResult {
  /** Message from the deposit transaction */
  message?: string
  /** Error message if transaction failed */
  error?: string
  /** Transaction hash on Filecoin network */
  transactionHash: string
  /** Status of the request */
  success: boolean
  /** CID of the uploaded content */
  cid: string
  /** Full URL where the content was uploaded to (on IPFS) */
  url: string
  /** Information about the uploaded file */
  fileInfo?: {
    /** File MIME type */
    type: string
    /** Size of the uploaded content (in bytes) */
    size: number
    /** UNIX timestamp (in seconds) when file was uploaded */
    uploadedAt: string
    /** Name of the file uploaded */
    filename: string
  }
}

/**
 * Metadata about a deposit stored in the database
 */
export interface DepositMetadata {
  /** Amount deposited in USDFC (as string to handle precision) */
  depositAmount: string
  /** Storage duration in days */
  durationDays: number
  /** User's wallet address */
  depositKey: string
  /** Optional user email for notifications */
  userEmail: string | null
  /** Name of the uploaded file */
  fileName: string | null
  /** MIME type of the file */
  fileType: string
  /** Size of the file in bytes */
  fileSize: number
  /** Expiration date (ISO 8601 string) */
  expiresAt: string
  /** Payment chain identifier */
  paymentChain: PaymentChain
  /** Token used for payment */
  paymentToken: PaymentToken
}

/**
 * Response from /upload/deposit-usdfc endpoint
 */
export interface DepositResponse {
  /** Status message */
  message: string
  /** CID of the uploaded content */
  cid: string
  /** Amount in USDFC required for payment */
  amountUSDFC: string
  /** Recipient address (Toju's wallet) to send USDFC to */
  recipientAddress: string
  /** USDFC contract address (network-specific) */
  usdfcContractAddress: string
  /** Number of files uploaded */
  fileCount: number
  /** Total size of all files in bytes */
  totalSize: number
  /** result of a successful upload */
  object: UploadResult
  /** Array of file information */
  files: Array<{
    name: string
    size: number
    type: string
  }>
  /** Metadata for database insertion */
  depositMetadata: DepositMetadata
}

/**
 * Arguments for creating a USDFC deposit
 */
export interface CreateDepositArgs {
  /** File(s) to upload */
  file: File[]
  /** Storage duration in days */
  duration: number
  /** User's wallet address */
  userAddress: string
  /** Optional user email for expiration notifications */
  userEmail?: string
  /** Callback to sign and send the USDFC transfer transaction */
  sendTransaction: (txData: TransactionData) => Promise<string>
}

/**
 * Transaction data for USDFC transfer
 */
export interface TransactionData {
  /** Recipient address (Toju's wallet) */
  to: string
  /** Amount in USDFC (as string with 6 decimals) */
  amount: string
  /** USDFC contract address */
  contractAddress: string
}

/**
 * Arguments for verifying USDFC payment
 */
export interface VerifyPaymentArgs {
  /** Transaction hash of the USDFC transfer */
  transactionHash: string
  /** CID of the uploaded content */
  cid: string
  /** Deposit metadata from server response */
  depositMetadata: DepositMetadata
}

/**
 * Response from /fil/verify-payment endpoint
 */
export interface VerifyPaymentResponse {
  /** Whether payment was verified successfully */
  verified: boolean
  /** Status message */
  message: string
  /** Transaction hash that was verified */
  transactionHash: string
  /** CID of the uploaded content */
  cid: string
}

/**
 * Individual upload history entry
 */
export interface UploadHistory {
  /** Unique identifier for the deposit */
  id: number
  /** User's wallet address */
  depositKey: string
  /** Content identifier */
  contentCid: string
  /** Storage duration in days */
  durationDays: number
  /** Amount deposited in USDFC */
  depositAmount: string
  /** Timestamp when deposit was created */
  createdAt: string
  /** Expiration date */
  expiresAt?: string
  /** User email */
  userEmail?: string
  /** File name */
  fileName?: string
  /** MIME type */
  fileType?: string
  /** File size in bytes */
  fileSize?: number
  /** Transaction hash */
  transactionHash?: string
  /** Deletion status */
  deletionStatus?: string
  /** Payment chain */
  paymentChain?: PaymentChain
  /** Payment token */
  paymentToken?: PaymentToken
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Total number of records */
  total: number
  /** Current page (1-indexed) */
  page: number
  /** Page size */
  pageSize: number
  /** Total pages */
  totalPages: number
  /** Next page URL */
  next: string | null
  /** Previous page URL */
  prev: string | null
}

/**
 * Response from upload history endpoint
 */
export interface UploadHistoryResponse extends PaginationMeta {
  /** Array of upload history entries */
  data: UploadHistory[] | null
  /** User address queried */
  userAddress: string
}

/**
 * Storage cost estimate
 */
export interface StorageCostEstimate {
  /** Cost in USDFC */
  usdfc: string
  /** Cost in USD (same as USDFC since 1:1 pegged) */
  usd: string
}

/**
 * Response from /storage/renewal-cost?chain=fil endpoint
 */
export interface StorageRenewalCost {
  /** New expiration date after renewal */
  newExpirationDate: string
  /** Current expiration date */
  currentExpirationDate: string
  /** Number of days being added */
  additionalDays: number
  /** Cost in USD */
  costUSD: number
  /** Cost in USDFC (as string to handle BigInt precision) */
  costInUsdfc: string
  /** Details about the file being renewed */
  fileDetails: {
    cid: string
    fileName: string | null
    fileSize: number
  }
}

/**
 * Response from /storage/renew-usdfc endpoint
 */
export interface RenewalPaymentDetails {
  /** CID of the content being renewed */
  cid: string
  /** Status message */
  message: string
  /** Recipient address for USDFC transfer */
  recipientAddress: string
  /** USDFC contract address */
  usdfcContractAddress: string
  /** Renewal duration in days */
  duration: number
  /** New expiration date after renewal */
  newExpirationDate: string
  /** Cost breakdown */
  cost: {
    usd: number
    usdfc: string
  }
}

/**
 * Parameters for renewing storage with USDFC
 */
export interface StorageRenewalParams {
  /** CID of the content to renew */
  cid: string
  /** Additional days to extend storage */
  duration: number
  /** User's Filecoin wallet address */
  userAddress: string
  /** Callback to send the USDFC transfer transaction */
  sendTransaction: (txData: TransactionData) => Promise<string>
}
