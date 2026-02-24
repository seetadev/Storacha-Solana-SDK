ALTER TABLE "uploads" ADD COLUMN "payment_chain" varchar(10) NOT NULL DEFAULT "sol";
ALTER TABLE "uploads" ADD COLUMN "payment_token" varchar(10) NOT NULL DEFAULT "SOL";

ALTER TABLE "transactions" ADD COLUMN "payment_chain" varchar(10) NOT NULL DEFAULT "sol";
ALTER TABLE "transactions" ADD COLUMN "payment_token" varchar(10) NOT NULL DEFAULT "SOL";
