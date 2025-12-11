CREATE TABLE "transaction" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"deposit_id" integer NOT NULL,
	"content_cid" text NOT NULL,
	"transaction_hash" varchar(255) NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount_in_lamports" bigint NOT NULL,
	"duration_days" integer NOT NULL,
	"created_at" date DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_transaction_hash_unique" UNIQUE("transaction_hash")
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_deposit_id_deposit_id_fk" FOREIGN KEY ("deposit_id") REFERENCES "public"."deposit"("id") ON DELETE cascade ON UPDATE no action;