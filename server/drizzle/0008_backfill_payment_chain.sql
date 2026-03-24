UPDATE "uploads" SET "payment_chain" = 'sol', "payment_token" = 'SOL' WHERE "payment_chain" IS NULL;
UPDATE "transactions" SET "payment_chain" = 'sol', "payment_token" = 'SOL' WHERE "payment_chain" IS NULL;
