export type PaymentChain = 'sol' | 'fil'

export type QuoteInput = {
  sizeInBytes: number
  durationInUnits: number
  chain?: PaymentChain
}

export type QuoteOutput = {
  effectiveDuration: number
  ratePerBytePerDay: number
  totalCost: number // in SOL or lamports we'll have to decide on this
}

export type PaginationQuery = {
  page?: number | string
  limit?: number | string
}

export type PaginationContext = {
  baseUrl: string
  path: string
}
