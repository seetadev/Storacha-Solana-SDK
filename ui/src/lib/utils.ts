/**
 * Format SOL amount for display
 * Always uses decimal notation, shows up to 9 decimal places for precision
 */
export const formatSOL = (amount: number): string => {
  if (amount === 0) return '0 SOL'
  // Show up to 9 decimals (lamport precision), remove trailing zeros
  return `${amount.toFixed(9).replace(/\.?0+$/, '')} SOL`
}

export const IS_DEV =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5040' : undefined

/**
 * Format USD amount for display
 */
export const formatUSD = (amount: number): string => {
  if (amount === 0) return '$0.00'
  if (amount >= 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return '< $0.01'
}

/**
 * Format file size in binary units (KiB, MiB, GiB, TiB, PiB)
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}
