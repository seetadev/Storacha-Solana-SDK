export type DelegationInput = {
  recipientDID: string;
  deadline: number; // expiration timestamp (seconds)
  notBefore?: number; // "not valid before" timestamp (seconds)
  baseCapabilities: string[];
  fileCID: string;
};

export type QuoteInput = {
  sizeInBytes: number;
  durationInUnits: number;
};

export type QuoteOutput = {
  effectiveDuration: number;
  ratePerBytePerDay: number;
  totalCost: number; // in SOL or lamports we'll have to decide on this
};
