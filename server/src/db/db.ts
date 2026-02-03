import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'

dotenv.config()
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql })
