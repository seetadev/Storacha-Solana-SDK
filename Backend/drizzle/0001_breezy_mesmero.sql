ALTER TABLE "deposit" ADD COLUMN "user_email" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "file_type" varchar(100);--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "file_size" bigint;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "transaction_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "deletion_status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "warning_sent_at" date;