/**
 * Sync Drizzle migration tracking with actual database state
 * Run this when migration tracking gets out of sync
 */
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;
dotenv.config();

async function syncMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Creating __drizzle_migrations table if it doesn't exist...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // Check which migrations are already recorded
    const existing = await pool.query("SELECT hash FROM __drizzle_migrations;");
    const existingHashes = new Set(existing.rows.map((r) => r.hash));

    console.log(`Found ${existingHashes.size} migrations already recorded`);

    // Mark migrations 0-2 as applied (since tables already exist)
    const migrationsToMark = [
      { hash: "0000_lethal_sasquatch", created_at: 1759762998007 },
      { hash: "0001_breezy_mesmero", created_at: 1763466447137 },
      { hash: "0002_polite_proteus", created_at: 1765467218512 },
    ];

    for (const migration of migrationsToMark) {
      if (!existingHashes.has(migration.hash)) {
        await pool.query(
          "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [migration.hash, migration.created_at],
        );
        console.log(`✓ Marked ${migration.hash} as applied`);
      } else {
        console.log(`- ${migration.hash} already recorded`);
      }
    }

    console.log("\n✓ Migration tracking synced successfully!");
    console.log("You can now run: pnpm migrations-apply");
  } catch (err) {
    console.error("Error syncing migrations:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncMigrations();
