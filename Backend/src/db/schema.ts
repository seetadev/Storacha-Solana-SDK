import {
  bigint,
  date,
  integer,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
  id: integer("id").primaryKey().$default(() => 1), // we'd only ever have one config for the program
  admin_key: varchar({ length: 44 }).notNull(),
  rate_per_byte_per_day: integer().notNull(),
  min_duration_days: integer().notNull(),
  withdrawal_wallet: varchar({ length: 255 }).notNull(),
});

export const depositAccount = pgTable("deposit", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deposit_key: varchar({ length: 44 }).notNull(),
  content_cid: text().notNull(),
  duration_days: integer().notNull(),
  deposit_amount: bigint({
    mode: "number",
  }).notNull(),
  deposit_slot: integer().notNull(),
  last_claimed_slot: integer().notNull(),
  created_at: date().notNull().default('2025-01-01'),
  fileName:varchar({ length:44}).notNull(),
  fileSize:varchar({ length:20}).notNull(),
  signature:text().default("")
  expires_at: date().default("2025-10-22")
});
