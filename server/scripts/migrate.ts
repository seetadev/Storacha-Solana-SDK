import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { access } from 'fs/promises'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

const env = process.argv[2] || 'staging'
const envFile = env === 'production' ? '.env.prod' : '.env'

console.log(`Running migrations for ${env} environment...`)
console.log(`Loading config from: ${envFile}`)

// Load env file only when the file actually exists; if DATABASE_URL is
// already set in the process environment (e.g. from a CI/CD secret or a
// Docker --env flag) we honour that value without requiring a file.
try {
  await access(envFile)
  config({ path: envFile })
  console.log(`Loaded env from ${envFile}`)
} catch {
  if (process.env.DATABASE_URL) {
    console.log(
      `${envFile} not found — using DATABASE_URL from the process environment`,
    )
  } else {
    // Fall back to .env so local runs without a .env.prod still work
    const fallback = '.env'
    console.log(`${envFile} not found — falling back to ${fallback}`)
    config({ path: fallback })
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    `\nERROR: DATABASE_URL is not set.\n` +
      `  • For production: create server/${envFile} and add DATABASE_URL=<your-prod-db-url>\n` +
      `  • Or export DATABASE_URL in your shell / CI environment before running this script.\n`,
  )
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const main = async () => {
  try {
    // ensure __drizzle_migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      );
    `

    // get already applied migrations
    const appliedMigrations = await sql`
      SELECT hash FROM __drizzle_migrations ORDER BY id;
    `
    const appliedSet = new Set(appliedMigrations.map((m) => m.hash))

    console.log(`Found ${appliedSet.size} previously applied migration(s)`)

    // read migration files
    const migrationsDir = path.join(process.cwd(), 'drizzle')
    const files = await readdir(migrationsDir)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

    console.log(`Found ${sqlFiles.length} migration file(s) on disk`)

    let appliedCount = 0

    // apply pending migrations
    for (const file of sqlFiles) {
      const migrationName = file.replace('.sql', '')

      if (appliedSet.has(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already applied)`)
        continue
      }

      console.log(`🔄 Applying ${migrationName}...`)

      const filePath = path.join(migrationsDir, file)
      const migrationSQL = await readFile(filePath, 'utf-8')

      // split by statement breakpoint and execute each statement
      // Strip trailing semicolons — the Neon serverless HTTP client silently
      // drops DDL statements that end with a semicolon in sql.unsafe() mode.
      const statements = migrationSQL
        .split('--> statement-breakpoint')
        .map((s) => s.trim().replace(/;$/, ''))
        .filter((s) => s.length > 0)

      for (const statement of statements) {
        try {
          await sql.unsafe(statement)
        } catch (error) {
          console.error(`❌ Error executing statement in ${migrationName}:`)
          console.error(statement)
          throw error
        }
      }

      // mark as applied
      await sql`
        INSERT INTO __drizzle_migrations (hash, created_at)
        VALUES (${migrationName}, ${Date.now()});
      `

      console.log(`✅ Applied ${migrationName}`)
      appliedCount++
    }

    if (appliedCount === 0) {
      console.log('\n✨ No new migrations to apply')
    } else {
      console.log(`\n✅ Successfully applied ${appliedCount} migration(s)`)
    }
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  }
}

main()
