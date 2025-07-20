CREATE TABLE "config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"admin_key" varchar(44) NOT NULL,
	"rate_per_byte_per_day" integer NOT NULL,
	"min_duration_days" integer NOT NULL,
	"withdrawal_wallet" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deposit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"deposit_key" varchar(44) NOT NULL,
	"content_cid" text NOT NULL,
	"duration_days" integer NOT NULL,
	"deposit_amount" integer NOT NULL,
	"deposit_slot" integer NOT NULL,
	"last_claimed_slot" integer NOT NULL
);
