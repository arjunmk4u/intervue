import { Request, Response } from 'express';
import { enqueue } from './voice.queue';
import { generateSpeech } from './tts.service';

export async function speakController(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  try {
    const audioBuffer = await enqueue(async () => generateSpeech(text));

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(audioBuffer);
  } catch (error) {
    console.error('[Voice] Failed to generate speech:', error);
    res.status(503).json({
      error: error instanceof Error ? error.message : 'voice_unavailable',
    });
  }
}
