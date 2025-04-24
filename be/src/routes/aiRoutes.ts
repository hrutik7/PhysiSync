import express from "express";
import { AiService } from "../services/aiService";

const router = express.Router();
const custom = new AiService();

router.post("/enable-ai", custom.enableAi);
router.get("/get-ai/:patientId", custom.getAI);
// router.post("/voice-ai", custom.voiceAi);
// router.post("/generate-token", custom);
export default router;
