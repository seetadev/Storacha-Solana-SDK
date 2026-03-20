import { ExactEvmScheme } from '@x402/evm/exact/client'
import { wrapFetchWithPayment, x402Client } from '@x402/fetch'
import 'dotenv/config'
import {
  createWalletClient,
  http,
  publicActions,
  type ReadContractParameters,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const rawKey = process.env.CLIENT_PRIVATE_KEY

if (!rawKey) throw new Error('CLIENT_PRIVATE_KEY is required in .env')

const privateKey = (
  rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
) as `0x${string}`

const account = privateKeyToAccount(privateKey)
console.log(`Paying from: ${account.address}`)

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
}).extend(publicActions)

// ExactEvmScheme needs { address, signTypedData } directly on the signer.
// walletClient.address is undefined — it's at walletClient.account.address.
// Passing `account` directly works for EIP-3009 (basic flow).
// walletClient is kept for readContract capability (permit2 extensions).
const signer = {
  address: account.address,
  signTypedData: (args: Parameters<typeof walletClient.signTypedData>[0]) =>
    walletClient.signTypedData(args),
  readContract: walletClient.readContract,
}

const x402 = new x402Client().register(
  'eip155:84532',
  new ExactEvmScheme(signer),
)

const fetchWithPay = wrapFetchWithPayment(fetch, x402)

const SERVER = 'http://localhost:4021'

console.log('\n--- GET /free ---')
const freeRes = await fetch(`${SERVER}/free`)
console.log(`Status: ${freeRes.status}`)
console.log(await freeRes.json())

console.log('\n--- GET /paid (x402) ---')
const paidRes = await fetchWithPay(`${SERVER}/paid`)
console.log(`Status: ${paidRes.status}`)
console.log(await paidRes.json())
console.log('Payment-Response header:', paidRes.headers.get('PAYMENT-RESPONSE'))
