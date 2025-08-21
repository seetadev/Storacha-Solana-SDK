export const DAY_TIME_IN_SECONDS = 24 * 60 * 60; // 86400 seconds in a day

/**
 * Convert time string to seconds
 * @param timeString - Time in format "YYYY-MM-DDTHH:mm" from datetime-local input
 * @returns Number of seconds since Unix epoch
 */
export const ConvertTimeToSeconds = (timeString: string): number => {
  const date = new Date(timeString);
  return Math.floor(date.getTime() / 1000);
};

/**
 * Format file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format Solana address for display
 * @param address - Full Solana address
 * @param chars - Number of characters to show from start and end
 * @returns Shortened address like "ABC...XYZ"
 */
export const formatSolanaAddress = (address: string, chars: number = 4): string => {
  if (address.length <= chars * 2) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};

/**
 * Calculate storage cost based on size and duration
 * @param sizeInBytes - File size in bytes
 * @param durationInDays - Storage duration in days
 * @param ratePerBytePerDay - Cost rate (default: 0.00001 SOL per byte per day)
 * @returns Total cost in SOL
 */
export const calculateStorageCost = (
  sizeInBytes: number, 
  durationInDays: number, 
  ratePerBytePerDay: number = 0.00001
): number => {
  return sizeInBytes * durationInDays * ratePerBytePerDay;
};

/**
 * Format SOL amount for display
 * @param amount - SOL amount
 * @param decimals - Number of decimal places
 * @returns Formatted SOL string
 */
export const formatSOL = (amount: number, decimals: number = 4): string => {
  return `${amount.toFixed(decimals)} SOL`;
};

/**
 * Validate file type
 * @param file - File object
 * @param allowedTypes - Array of allowed MIME types
 * @returns Boolean indicating if file type is allowed
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Convert duration days to readable format
 * @param days - Number of days
 * @returns Human readable duration string
 */
export const formatDuration = (days: number): string => {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
};
