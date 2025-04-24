import express from 'express'

import { InterventionService } from '../services/interventionService'

const router = express.Router()
// console.log("im in interventionRoutes")
router.post('/createInterventiondiagnosis', InterventionService.createInterventiondiagnosis)
router.get('/getInterventiondiagnosis/:patientId', InterventionService.getInterventiondiagnosis)
router.put('/updateInterventiondiagnosis/:id', InterventionService.updateInterventiondiagnosis)
router.delete('/deleteInterventiondiagnosis/:id', InterventionService.deleteInterventiondiagnosis)

router.post('/createInterventionGoal', InterventionService.createInterventionGoal);
router.get('/getInterventionGoal/:patientId', InterventionService.getInterventionGoal);
router.put('/updateInterventionGoal/:id', InterventionService.updateInterventionGoal);
router.delete('/deleteInterventionGoal/:id', InterventionService.deleteInterventionGoal);

router.post('/createInterventionTreatmentEncounter', InterventionService.createInterventionTreatmentEncounter);
router.get('/getInterventionTreatmentEncounter/:patientId', InterventionService.getInterventionTreatmentEncounter);
router.put('/updateInterventionTreatmentEncounter/:id', InterventionService.updateInterventionTreatmentEncounter);
router.delete('/deleteInterventionTreatmentEncounter/:id', InterventionService.deleteInterventionTreatmentEncounter);

router.post('/createInterventionTreatmentProtocol', InterventionService.createInterventionTreatmentProtocol);
router.get('/getInterventionTreatmentProtocol/:patientId', InterventionService.getInterventionTreatmentProtocol);
router.put('/updateInterventionTreatmentProtocol/:id', InterventionService.updateInterventionTreatmentProtocol);
router.delete('/deleteInterventionTreatmentProtocol/:id', InterventionService.deleteInterventionTreatmentProtocol);

router.post("/interventionProtocol", InterventionService.createInterventionProtocol);
router.get("/interventionProtocol/:patientId", InterventionService.getInterventionProtocol);
router.put("/interventionProtocol/:id", InterventionService.updateInterventionProtocol);
router.delete("/interventionProtocol/:id", InterventionService.deleteInterventionProtocol);

export default router