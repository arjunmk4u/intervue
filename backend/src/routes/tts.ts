import express from 'express';
import { generateGeminiSpeech } from '../services/gemini-tts-service';

const router = express.Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const ttsResult = await generateGeminiSpeech(text);

    if (!ttsResult.ok) {
      return res.status(ttsResult.statusCode || 503).json({
        error: 'TTS unavailable',
        fallback: true,
        reason: ttsResult.reason,
        message: ttsResult.message,
        retryAfterMs: ttsResult.retryAfterMs,
        model: ttsResult.model,
      });
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': ttsResult.audioBuffer.length,
      'Cache-Control': 'no-cache',
    });

    res.send(ttsResult.audioBuffer);
  } catch (error) {
    console.error('[TTS Route] Error:', error);
    res.status(503).json({ error: 'TTS service failed', fallback: true });
  }
});

export default router;
