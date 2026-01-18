export const getExpiryDate = (duration: number) => {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getUTCDate() + Number(duration));

  const expiryDate = future.toISOString();
  return expiryDate;
};

export function getPaginationParams(query: any) {
  const page = Math.max(parseInt(query.page ?? '1', 10), 1)
  const limit = Math.max(parseInt(query.limit ?? '20', 10), 1)

  const offset = (page - 1) * limit

  return { page, limit, offset }
}
