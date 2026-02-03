import express from 'express'
import * as serverController from '../controllers/server.controller.js'

export const serverRouter = express.Router()

serverRouter.get('/', serverController.getServerHealth)
