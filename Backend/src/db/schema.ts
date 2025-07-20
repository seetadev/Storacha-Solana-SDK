import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
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
  deposit_amount: integer().notNull(),
  deposit_slot: integer().notNull(),
  last_claimed_slot: integer().notNull(),
});
