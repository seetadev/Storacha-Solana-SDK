/**
 * Function to format user address for query
 * @param walletAddress
 * @returns
 */
export const formatUserAddressForQuery = (walletAddress: string) => {
  return walletAddress.toLowerCase();
};

export const getExpiryDate = (duration: number) => {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getUTCDate() + Number(duration));

  const expiryDate = future.toISOString();
  return expiryDate;
};
