ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "payment_chain" varchar(10) DEFAULT 'sol';--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "payment_token" varchar(10) DEFAULT 'SOL';--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "payment_chain" varchar(10) DEFAULT 'sol';--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "payment_token" varchar(10) DEFAULT 'SOL';
