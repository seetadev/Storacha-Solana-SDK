import express from 'express'
import multer from 'multer'
import * as uploadsController from '../controllers/upload.controller.js'
import { uploadLimiter } from '../middlewares/rate-limit.middleware.js'

const upload = multer()

export const uploadsRouter = express.Router()

uploadsRouter.post(
  '/deposit',
  upload.fields([{ name: 'file' }]),
  uploadsController.deposit,
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
