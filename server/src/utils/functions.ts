import { PaginationQuery } from "../types/StorachaTypes.js";

export const getExpiryDate = (duration: number) => {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getUTCDate() + Number(duration));

  const expiryDate = future.toISOString();
  return expiryDate;
};

export function getPaginationParams(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1), 1)
  const limit = Math.max(Number(query.limit ?? 20), 1)

  const offset = (page - 1) * limit

  return { page, limit, offset }
}
