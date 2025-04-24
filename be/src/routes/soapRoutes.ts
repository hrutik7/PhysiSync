import express from 'express';
import { SOAPService } from '../services/soapService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const soap = new SOAPService();
router.use(authMiddleware);
// router.use(verifyClinic);
// Subjective routes
router.post('/subjective', soap.addSubjective);
router.get('/subjective/:patientId', soap.getSubjective);
router.delete('/subjective/:id', soap.deleteSubjective);
router.put('/subjective/:id', soap.updateSubjective)

// Objective routes
router.post('/objective', soap.addObjective);
router.get('/objective/:patientId', soap.getObjective);
router.delete('/objective/:id', soap.deleteObjective);
router.put('/objective/:id', soap.updateObjective);

// Assessment routes
router.post('/assessment', soap.addAssessment);
router.get('/assessment/:patientId', soap.getAssessment);
router.delete('/assessment/:id', soap.deleteAssessment);
router.put('/assessment/:id', soap.updateAssessment);

// Plan routes
router.post('/plan', soap.addPlan);
router.get('/plan/:patientId', soap.getPlan);
router.delete('/plan/:id', soap.deletePlan);
router.put('/plan/:id', soap.updateAssessment);

// Get full SOAP
// router.get('/full/:patientId', soap.getFullSOAP);

export default router;

