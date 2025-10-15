ALTER TABLE "deposit" ADD COLUMN "fileName" varchar(44) NOT NULL;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "fileSize" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "signature" text DEFAULT '';