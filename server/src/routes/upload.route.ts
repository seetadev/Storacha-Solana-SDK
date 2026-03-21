import express from 'express'
import multer from 'multer'
import * as agentController from '../controllers/agent.controller.js'
import * as uploadsController from '../controllers/upload.controller.js'
import { uploadLimiter } from '../middlewares/rate-limit.middleware.js'
import { agentPaymentMiddleware } from '../middlewares/x402.middleware.js'

const upload = multer()

export const uploadsRouter = express.Router()

// x402 payment gate — applies only to POST /agent, passes through all other routes
if (agentPaymentMiddleware) uploadsRouter.use(agentPaymentMiddleware)

uploadsRouter.post(
  '/deposit',
  upload.fields([{ name: 'file' }]),
  uploadsController.deposit,
)
uploadsRouter.post(
  '/deposit-usdfc',
  upload.fields([{ name: 'file' }]),
  uploadsController.depositUsdFC,
)
uploadsRouter.post(
  '/file',
  uploadLimiter,
  upload.single('file'),
  uploadsController.uploadFile,
)
uploadsRouter.post(
  '/files',
  uploadLimiter,
  upload.array('file'),
  uploadsController.uploadFiles,
)
uploadsRouter.get('/history', uploadsController.getUploadHistory)
uploadsRouter.post('/confirm', uploadsController.confirmUpload)
uploadsRouter.post('/fil/verify-payment', uploadsController.verifyUsdFcPayment)

uploadsRouter.post(
  '/agent',
  upload.single('file'),
  agentController.uploadAgentFile,
)
