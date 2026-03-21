import express from 'express';
import { generateGeminiSpeech } from '../services/gemini-tts-service';

const router = express.Router();

// POST /api/tts  { text: string }
// Returns audio/wav from Gemini TTS (Aoede voice)
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const audioBuffer = await generateGeminiSpeech(text);

    if (!audioBuffer) {
      // Gemini not configured or failed — client falls back to Web Speech API
      return res.status(503).json({ error: 'TTS unavailable', fallback: true });
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache',
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('[TTS Route] Error:', error);
    res.status(503).json({ error: 'TTS service failed', fallback: true });
  }
});

export default router;
