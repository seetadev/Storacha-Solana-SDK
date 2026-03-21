import { HTTPFacilitatorClient } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import 'dotenv/config'
import express from 'express'

const payTo = process.env.PAY_TO_ADDRESS as `0x${string}`

if (!payTo) throw new Error('PAY_TO_ADDRESS is required in .env')

const facilitator = new HTTPFacilitatorClient()

const server = new x402ResourceServer(facilitator).register(
  'eip155:84532', // Base Sepolia
  new ExactEvmScheme(),
)

const app = express()

app.use(
  paymentMiddleware(
    {
      'GET /paid': {
        accepts: {
          scheme: 'exact',
          network: 'eip155:84532',
          payTo,
          price: '$0.001',
        },
        description: 'x402 spike — pay $0.001 USDC on Base Sepolia',
      },
    },
    server,
  ),
)

app.get('/paid', (req, res) => {
  res.json({
    message: "Payment verified. You're in.",
    timestamp: new Date().toISOString(),
  })
})

app.get('/free', (req, res) => {
  res.json({ message: "This one's free." })
})

const PORT = 4021
app.listen(PORT, () => {
  console.log(`x402 spike server running on http://localhost:${PORT}`)
  console.log(`  GET /free  — no payment required`)
  console.log(`  GET /paid  — requires $0.001 USDC on Base Sepolia`)
  console.log(`  Receiving wallet: ${payTo}`)
})
