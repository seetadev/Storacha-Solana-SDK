import { neon } from '@neondatabase/serverless'
import { Keypair } from '@solana/web3.js'
import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { configTable } from '../src/db/schema.js'

dotenv.config()

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle({ client: sql })

async function seedConfig() {
  try {
    console.log('Checking if config already exists...')

    const existing = await db.select().from(configTable).limit(1)

    if (existing.length > 0) {
      console.log('✅ Config already exists, skipping seed')
      return
    }

    console.log('Seeding config table...')

    let adminPublicKey: string = 'YOUR_SOLANA_WALLET_PUBLIC_KEY'
    let withdrawalWallet: string

    if (!process.env.ADMIN_KEYPAIR) {
      console.error('❌ ADMIN_KEYPAIR not set in .env')
      console.error(
        '   Generate one for yourself by calling: ./scripts/generate-admin-key.sh',
      )
      process.exit(1)
    }

    try {
      const secretKey = Uint8Array.from(JSON.parse(process.env.ADMIN_KEYPAIR))
      const keypair = Keypair.fromSecretKey(secretKey)
      adminPublicKey = keypair.publicKey.toBase58()
      console.log(
        `✅ Derived admin public key from ADMIN_KEYPAIR: ${adminPublicKey}`,
      )
    } catch (_error) {
      console.error(
        '❌ Failed to parse ADMIN_KEYPAIR. Ensure it is a JSON array of numbers.',
      )
      process.exit(1)
    }

    withdrawalWallet = process.env.WITHDRAWAL_WALLET || adminPublicKey

    await db.insert(configTable).values({
      id: 1,
      adminKey: adminPublicKey,
      ratePerBytePerDay: 3000000000.0, // 0.000000000003 USD rate (explicit float)
      minDurationDays: 7,
      withdrawalWallet: withdrawalWallet,
    })

    console.log('✅ Config table seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding config:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seedConfig()
