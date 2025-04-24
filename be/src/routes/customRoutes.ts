import express from 'express'
import { customService } from '../services/customService'

const router = express.Router()
const custom = new customService()

router.post('/history', custom.patientHistory)
router.post('/chief-complaints', custom.patientchiefComplanits)
router.post('/pain', custom.patientPain)
router.post('/examination', custom.patientExamination)
router.post('/motor-examination', custom.patientmotorExamination)
router.post('/sensory-examination', custom.patientsensoryExamination)
router.post('/pediatric-examination', custom.patientPediatrics)

// New GET routes
router.get('/history/:patientId', custom.getPatientHistory)
router.get('/chief-complaints/:patientId', custom.getPatientChiefComplaints)
router.get('/pain/:patientId', custom.getPatientPain)
router.get('/examination/:patientId', custom.getPatientExamination)
router.get('/motor-examination/:patientId', custom.getPatientMotorExamination)
router.get('/sensory-examination/:patientId', custom.getPatientSensoryExamination)
router.get('/pediatric-examination/:patientId', custom.getPatientPediatrics)

export default router;