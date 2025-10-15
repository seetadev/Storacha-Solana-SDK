export interface StorageOption {
  duration: number;
  label: string;
  costPerMB: number;
  popular?: boolean;
  description?: string;
}

export interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  ipfsHash?: string;
  transactionHash?: string;
  cost?: string;
}

export interface UserStats {
  totalFiles: number;
  totalStorage: string;
  storageUsed: string;
  storageLimit: string;
  totalSpent: string;
  activeFiles: number;
  sharedFiles: number;
}

export interface WalletContextType {
  walletConnected: boolean;
  solanaPublicKey: string | null;
  solanaBalance: number | null;
  isLoading: boolean;
  handleWalletConnected: () => void;
  handleWalletDisconnected: () => void;
  refreshBalance: () => Promise<void>;
}

export interface TransactionResult {
  signature: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: Date;
  cost: number;
}

export interface UploadResult {
  success: boolean;
  cid?: string;
  transactionHash?: string;
  error?: string;
}

export interface UploadedFile {
  id: string;
  cid: string;
  filename: string;
  size: number;
  type?: string;
  url: string;
  uploadedAt: string;
  signature: string;
  duration: number;
  cost: number; //
  status: "active" | "expired" | "pending";
}
export interface DashboardStats {
  totalFiles: number;
  totalStorage: number;
  totalSpent: number;
  activeFiles: number;
}
