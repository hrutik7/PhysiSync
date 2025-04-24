import * as express from "express"

import { patientService } from "../services/patientService"
import { authMiddleware } from "../middleware/authMiddleware";
const patientServiceInstance = new patientService();

const router = express.Router();

router.use(authMiddleware);
router.post('/add-patient', patientServiceInstance.addPatient);

router.get('/getpatients', patientServiceInstance.getPatients);


router.put('/updatePatient/:id', patientServiceInstance.updatePatient);


export default router