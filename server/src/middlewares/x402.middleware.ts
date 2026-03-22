import { facilitator as cdpFacilitator } from '@coinbase/x402'
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { paymentMiddleware } from '@x402/express'
import { getAmountInUSD } from '../utils/constant.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/storacha.js'

const isMainnet = process.env.X402_NETWORK === 'mainnet'
const BASE_NETWORK = isMainnet ? 'eip155:8453' : 'eip155:84532'

const payTo = process.env.BASE_USDC_WALLET

let agentPaymentMiddleware: ReturnType<typeof paymentMiddleware> | null = null

if (!payTo) {
  logger.warn(
    'BASE_USDC_WALLET is not set — POST /upload/agent will not require payment',
  )
} else {
  logger.info('initialising x402 payment middleware', {
    network: BASE_NETWORK,
    facilitator: isMainnet ? 'cdp' : 'x402.org',
    payTo,
  })

  try {
    const facilitatorConfig = isMainnet
      ? cdpFacilitator
      : { url: 'https://x402.org/facilitator' }
    const facilitator = new HTTPFacilitatorClient(facilitatorConfig)
    const x402Server = new x402ResourceServer(facilitator).register(
      BASE_NETWORK,
      new ExactEvmScheme(),
    )

    agentPaymentMiddleware = paymentMiddleware(
      {
        'POST /agent': {
          accepts: {
            scheme: 'exact',
            network: BASE_NETWORK,
            payTo,
            price: async (context) => {
              const sizeParam = context.adapter.getQueryParam?.('size')
              const durationParam = context.adapter.getQueryParam?.('duration')
              const size = parseInt(
                (Array.isArray(sizeParam) ? sizeParam[0] : sizeParam) || '0',
                10,
              )
              const duration = parseInt(
                (Array.isArray(durationParam)
                  ? durationParam[0]
                  : durationParam) || '1',
                10,
              )
              const { ratePerBytePerDay } = await getPricingConfig()
              const costUSD = getAmountInUSD(size, ratePerBytePerDay, duration)
              // minimum $0.000001 to avoid zero-price edge cases on tiny files
              return `$${Math.max(costUSD, 0.000001).toFixed(6)}`
            },
          },
        },
      },
      x402Server,
    )

    logger.info('x402 payment middleware initialised successfully')
  } catch (err) {
    logger.error('failed to initialise x402 payment middleware', {
      error: err,
    })
  }
}

export { agentPaymentMiddleware }
