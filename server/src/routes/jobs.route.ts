import express from 'express'
import * as jobsController from '../controllers/jobs.controller.js'
import { verifyQStashRequest } from '../middlewares/qstash.middleware.js'

export const jobs = express.Router()

jobs.post(
  '/send-warnings',
  verifyQStashRequest,
  jobsController.sendExpirationWarnings,
)

jobs.post(
  '/delete-expired',
  verifyQStashRequest,
  jobsController.deleteExpiredUploads,
)

jobs.post(
  '/usage/snapshot',
  verifyQStashRequest,
  jobsController.dailyUsageSnapshot,
)

jobs.post(
  '/usage/compare',
  verifyQStashRequest,
  jobsController.weeklyUsageComparison,
)
