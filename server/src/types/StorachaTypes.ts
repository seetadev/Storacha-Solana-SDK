export type QuoteInput = {
  sizeInBytes: number;
  durationInUnits: number;
};

export type QuoteOutput = {
  effectiveDuration: number;
  ratePerBytePerDay: number;
  totalCost: number; // in SOL or lamports we'll have to decide on this
};
