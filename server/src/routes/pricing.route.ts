import express from 'express'
import * as pricingController from '../controllers/pricing.controller.js'

export const pricingRouter = express.Router()

pricingRouter.get('/quote', pricingController.GetQuoteForFileUpload)
pricingRouter.get('/sol', pricingController.getSolUsdPrice)
