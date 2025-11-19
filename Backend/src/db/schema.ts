import {
  bigint,
  date,
  integer,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
  id: integer("id")
    .primaryKey()
    .$default(() => 1), // we'd only ever have one config for the program
  adminKey: varchar("admin_key", { length: 44 }).notNull(),
  ratePerBytePerDay: integer("rate_per_byte_per_day").notNull(),
  minDurationDays: integer("min_duration_days").notNull(),
  withdrawalWallet: varchar("withdrawal_wallet", { length: 255 }).notNull(),
});

export const depositAccount = pgTable("deposit", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  depositKey: varchar("deposit_key", { length: 44 }).notNull(),
  contentCid: text("content_cid").notNull(),
  durationDays: integer("duration_days").notNull(),
  depositAmount: bigint("deposit_amount", {
    mode: "number",
  }).notNull(),
  depositSlot: integer("deposit_slot").notNull(),
  lastClaimedSlot: integer("last_claimed_slot").notNull(),
  createdAt: date("created_at").notNull().default("2025-01-01"),
  expiresAt: date("expires_at").default("2025-10-22"),
  userEmail: varchar("user_email", { length: 255 }),
  fileName: text("file_name"),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: bigint("file_size", { mode: "number" }),
  transactionHash: varchar("transaction_hash", { length: 255 }),
  // this could be of type (value) 'active' | 'warned' | 'deleted'
  deletionStatus: varchar("deletion_status", { length: 20 })
    .notNull()
    .default("active"),
  warningSentAt: date("warning_sent_at"),
});
