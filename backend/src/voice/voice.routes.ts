import express from 'express';
import { speakController } from './voice.controller';
import { voiceUpstreamDiagnosticController } from './voice.diagnostic';

const router = express.Router();

router.post('/speak', speakController);
router.get('/diagnostics/upstream', voiceUpstreamDiagnosticController);

export default router;
