import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'

dotenv.config()
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql })

/**
 * Columns the PPT upload/retrieve path reads and writes. Older databases
 * were created before these existed, and a missing transaction_hash makes
 * the replay check throw instead of returning no row.
 */
const UPLOAD_COLUMNS = [
  `alter table uploads add column if not exists transaction_hash varchar(255)`,
  `alter table uploads add column if not exists user_email varchar(255)`,
  `alter table uploads add column if not exists file_name text`,
  `alter table uploads add column if not exists file_type varchar(100)`,
  `alter table uploads add column if not exists file_size bigint`,
  `alter table uploads add column if not exists deletion_status varchar(20) default 'active'`,
  `alter table uploads add column if not exists warning_sent_at date`,
  `alter table uploads add column if not exists payment_chain varchar(10) default 'sol'`,
  `alter table uploads add column if not exists payment_token varchar(10) default 'SOL'`,
  `alter table uploads add column if not exists kubo_node_url varchar(500)`,
]

let uploadSchemaReady: Promise<void> | null = null

export function ensureUploadSchema(): Promise<void> {
  uploadSchemaReady ??= (async () => {
    for (const statement of UPLOAD_COLUMNS) {
      await sql.query(statement)
    }
  })().catch((error) => {
    uploadSchemaReady = null
    throw error
  })
  return uploadSchemaReady
}

/** Replay lookup. LIMIT is literal so Neon does not bind it as text. */
export async function findUploadIdByTxHash(
  txHash: string,
): Promise<number | undefined> {
  await ensureUploadSchema()
  const rows = await sql.query(
    'select id from uploads where transaction_hash = $1 limit 1',
    [txHash],
  )
  const row = rows[0] as { id?: number } | undefined
  return row?.id
}
