export const getExpiryDate = (duration: number) => {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getUTCDate() + Number(duration));

  const expiryDate = future.toISOString();
  return expiryDate;
};
