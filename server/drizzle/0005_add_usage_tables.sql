CREATE TABLE "usage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"snapshot_date" date DEFAULT now() NOT NULL,
	"total_bytes_stored" bigint NOT NULL,
	"total_active_uploads" integer NOT NULL,
	"storacha_reported_bytes" bigint,
	"storacha_plan_limit" bigint,
	"utilization_percentage" real,
	"created_at" date DEFAULT now() NOT NULL
);

CREATE TABLE "usage_comparison" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usage_comparison_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comparison_date" date DEFAULT now() NOT NULL,
	"our_calculated_bytes" bigint NOT NULL,
	"storacha_reported_bytes" bigint NOT NULL,
	"discrepancy_bytes" bigint NOT NULL,
	"discrepancy_percentage" real NOT NULL,
	"status" varchar(20) DEFAULT 'ok' NOT NULL,
	"notes" text,
	"created_at" date DEFAULT now() NOT NULL
);

CREATE TABLE "usage_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usage_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"alert_type" varchar(50) NOT NULL,
	"alert_level" varchar(20) NOT NULL,
	"utilization_percentage" real,
	"bytes_stored" bigint,
	"plan_limit" bigint,
	"message" text NOT NULL,
	"resolved" date,
	"created_at" date DEFAULT now() NOT NULL
);
