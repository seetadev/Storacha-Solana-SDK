CREATE TABLE IF NOT EXISTS "share_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "share_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"share_token" varchar(64) NOT NULL UNIQUE,
	"content_cid" text NOT NULL,
	"owner_id" varchar(44) NOT NULL,
	"file_name" text,
	"file_type" varchar(100),
	"file_size" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"max_views" integer,
	"current_views" integer DEFAULT 0 NOT NULL,
	"password_hash" varchar(255),
	"password_hint" varchar(255),
	"permissions" json DEFAULT '["view"]'::json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_accessed_at" timestamp,
	"metadata" json
);

CREATE TABLE IF NOT EXISTS "share_access_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "share_access_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"share_id" integer NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"location" varchar(255),
	"access_type" varchar(20) DEFAULT 'view' NOT NULL,
	"success" boolean DEFAULT true NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "share_access_log" ADD CONSTRAINT "share_access_log_share_id_share_links_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_share_token" ON "share_links" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_owner_id" ON "share_links" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_content_cid" ON "share_links" ("content_cid");
CREATE INDEX IF NOT EXISTS "idx_share_id_access_log" ON "share_access_log" ("share_id");
CREATE INDEX IF NOT EXISTS "idx_accessed_at" ON "share_access_log" ("accessed_at");
