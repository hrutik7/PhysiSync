import express from 'express'

import { axService } from '../services/axService'

const router = express.Router()

const ax = new axService()

router.post('/hip', ax.addHipAx)
router.get('/hip/:patientId', ax.getHipAx)

router.post('/knee', ax.addKneeAx)
router.get('/knee/:patientId', ax.getKneeAx)

router.post('/shoulder', ax.addShoulderAx)
router.get('/shoulder/:patientId', ax.getShoulderAx)

router.post('/foot', ax.addFootAx)
router.get('/foot/:patientId', ax.getFootAx)

export default router