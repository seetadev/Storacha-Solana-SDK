import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const env = process.argv[2] || "staging";
const envFile = env === "production" ? ".env.prod" : ".env";

console.log(`Running migrations for ${env} environment...`);
console.log(`Loading config from: ${envFile}`);

config({ path: envFile });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const main = async () => {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
};

main();
