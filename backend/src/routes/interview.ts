import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Session, { IMessage } from '../models/Session';
import Resume from '../models/Resume';
import { parsePdfToText, extractResumeData } from '../services/resume-parser';
import { generateNextQuestion } from '../services/gpt-service';
import { advancePhaseIfNeeded } from '../interview-engine/phase-controller';
import { evaluateResponse } from '../analysis-engine/evaluation.service';
import { analyzeBehavioral, generateCoachingTip } from '../analysis-engine/behavioral.service';
import { analyzeSpeech } from '../analysis-engine/speech.service';
import { calculateOverallScore } from '../analysis-engine/scoring.service';

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
    const { domain, experienceLevel = 'Fresher' } = req.body;
    const sessionId = crypto.randomUUID();

    const session = new Session({
      sessionId,
      domain,
      experienceLevel,
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

router.post('/analyze-response', async (req, res) => {
  try {
    const { sessionId, question, answer, audioMeta } = req.body;
    
    if (!sessionId || !question || !answer) {
      return res.status(400).json({ error: 'sessionId, question, and answer required' });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Run parallel analysis
    const [evaluation, behavioral, tip] = await Promise.all([
      evaluateResponse(question, answer),
      analyzeBehavioral(question, answer),
      generateCoachingTip(question, answer)
    ]);

    const speech = analyzeSpeech(answer, audioMeta);

    // Save to session
    if (!session.evaluations) session.evaluations = [];
    session.evaluations.push({ evaluation, behavioral, speech });
    await session.save();

    res.json({ evaluation, behavioral, speech, tip });
  } catch (error) {
    console.error('Analyze response error:', error);
    res.status(500).json({ error: 'Failed to analyze response' });
  }
});

router.get('/final-report', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const session = await Session.findOne({ sessionId: sessionId as string });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const report = calculateOverallScore(session.evaluations || []);
    res.json(report);
  } catch (error) {
    console.error('Final report error:', error);
    res.status(500).json({ error: 'Failed to generate final report' });
  }
});

export default router;
