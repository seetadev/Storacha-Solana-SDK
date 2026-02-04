import express from 'express'
import multer from 'multer'
import * as uploadController from '../controllers/upload.controller.js'
import { logger } from '../utils/logger.js'

const upload = multer()

export const solanaRouter = express.Router()

solanaRouter.post(
  '/deposit',
  upload.fields([{ name: 'file' }]),
  uploadController.deposit,
)

solanaRouter.post('/rpc', async (req, res) => {
  try {
    const rpcUrl =
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    logger.error('RPC proxy error', { error })
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
      },
      id: req.body?.id || null,
    })
  }
})
