import express from 'express'
import * as storageController from '../controllers/storage.controller.js'

export const storageRouter = express.Router()

storageRouter.get('/renewal-cost', storageController.getStorageRenewalCost)
storageRouter.post('/renew', storageController.renewStorage)
storageRouter.post('/confirm-renewal', storageController.confirmStorageRenewal)
