import {
  bigint,
  date,
  integer,
  pgTable,
  real,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
  id: integer("id")
    .primaryKey()
    .$default(() => 1), // we'd only ever have one config for the program
  adminKey: varchar("admin_key", { length: 44 }).notNull(),
  ratePerBytePerDay: real("rate_per_byte_per_day").notNull(),
  minDurationDays: integer("min_duration_days").notNull(),
  withdrawalWallet: varchar("withdrawal_wallet", { length: 255 }).notNull(),
});

export const uploads = pgTable("uploads", {
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

export const transaction = pgTable("transaction", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  depositId: integer("deposit_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "cascade" }),
  contentCid: text("content_cid").notNull(),
  transactionHash: varchar("transaction_hash", { length: 255 })
    .notNull()
    .unique(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'initial_deposit' | 'renewal'
  amountInLamports: bigint("amount_in_lamports", { mode: "number" }).notNull(),
  durationDays: integer("duration_days").notNull(),
  createdAt: date("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const usage = pgTable("usage", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  snapshotDate: date("snapshot_date", { mode: "date" }).notNull().defaultNow(),
  totalBytesStored: bigint("total_bytes_stored", { mode: "number" }).notNull(),
  totalActiveUploads: integer("total_active_uploads").notNull(),
  storachaReportedBytes: bigint("storacha_reported_bytes", { mode: "number" }),
  storachaPlanLimit: bigint("storacha_plan_limit", { mode: "number" }),
  utilizationPercentage: real("utilization_percentage"),
  createdAt: date("created_at", { mode: "date" }).notNull().defaultNow(),
});

// compares whatver we've stored in our db with the data (capability.usage.report) we get from storacha
export const usageComparison = pgTable("usage_comparison", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  comparisonDate: date("comparison_date", { mode: "date" })
    .notNull()
    .defaultNow(),
  ourCalculatedBytes: bigint("our_calculated_bytes", {
    mode: "number",
  }).notNull(),
  storachaReportedBytes: bigint("storacha_reported_bytes", {
    mode: "number",
  }).notNull(),
  discrepancyBytes: bigint("discrepancy_bytes", { mode: "number" }).notNull(),
  discrepancyPercentage: real("discrepancy_percentage").notNull(),
  // 'ok' | 'warning' | 'critical'
  status: varchar("status", { length: 20 }).notNull().default("ok"),
  notes: text("notes"),
  createdAt: date("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const usageAlerts = pgTable("usage_alerts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // 'threshold_80' | 'threshold_90' | 'threshold_95' | 'comparison_discrepancy'
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  // 'warning' | 'critical'
  alertLevel: varchar("alert_level", { length: 20 }).notNull(),
  utilizationPercentage: real("utilization_percentage"),
  bytesStored: bigint("bytes_stored", { mode: "number" }),
  planLimit: bigint("plan_limit", { mode: "number" }),
  message: text("message").notNull(),
  resolved: date("resolved", { mode: "date" }),
  createdAt: date("created_at", { mode: "date" }).notNull().defaultNow(),
});
