import express from "express";
import { InvestigateService, uploadMiddleware } from "../services/investigateService";

const router = express.Router();

router.post("/investigatepatient", uploadMiddleware, InvestigateService.investigateSave);
router.get("/getinvestigation", InvestigateService.getInvestigation);
router.delete('/deleteinvestigation/:id', InvestigateService.deleteInvestigation);
// router.get('/download/:id', InvestigateService.viewFile);
export default router;