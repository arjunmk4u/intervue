import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Session, { IMessage } from '../models/Session';
import Resume from '../models/Resume';
import { parsePdfToText, extractResumeData } from '../services/resume-parser';
import { generateNextQuestion } from '../services/gpt-service';
import { advancePhaseIfNeeded } from '../interview-engine/phase-controller';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const text = await parsePdfToText(req.file.buffer);
    const structuredData = await extractResumeData(text);

    const resume = new Resume({
      sessionId,
      originalFileName: req.file.originalname,
      extractedText: text,
      structuredData
    });

    await resume.save();

    await Session.findOneAndUpdate({ sessionId }, { resumeId: resume._id });

    res.json({ message: 'Resume uploaded and parsed', data: structuredData });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

router.post('/start-session', async (req, res) => {
  try {
    const { domain, difficulty = 'medium' } = req.body;
    const sessionId = crypto.randomUUID();

    const session = new Session({
      sessionId,
      domain,
      difficulty,
      phase: 'intro',
      questionIndex: 0,
      history: []
    });
    
    // Generate the first question
    const firstQuestion = await generateNextQuestion(session, null);
    
    session.history.push({
      role: 'assistant',
      content: firstQuestion,
      timestamp: new Date()
    } as IMessage);
    
    await session.save();

    res.json({ 
      sessionId, 
      question: firstQuestion, 
      phase: session.phase
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
});

router.post('/next-question', async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Append user answer to history
    session.history.push({
      role: 'user',
      content: answer,
      timestamp: new Date()
    } as IMessage);

    // Increase question index for that phase
    session.questionIndex += 1;
    
    // Check if we need to advance phase
    advancePhaseIfNeeded(session);
    
    // Fetch resume data if exists
    let resumeData = null;
    if (session.resumeId) {
      const resume = await Resume.findById(session.resumeId);
      if (resume) resumeData = resume.structuredData;
    }

    // Generate next question
    const nextQuestion = await generateNextQuestion(session, resumeData);

    session.history.push({
      role: 'assistant',
      content: nextQuestion,
      timestamp: new Date()
    } as IMessage);

    await session.save();

    res.json({ 
      question: nextQuestion, 
      phase: session.phase
    });
  } catch (error) {
    console.error('Next question error:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

export default router;
