import express from 'express';
import { speakController } from './voice.controller';

const router = express.Router();

router.post('/speak', speakController);

export default router;
