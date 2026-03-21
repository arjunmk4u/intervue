import { Request, Response } from 'express';
import { enqueue } from './voice.queue';
import { generateSpeech } from './tts.service';

export async function speakController(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ audioUrl: null, fallback: true, error: 'text is required' });
    return;
  }

  try {
    const audioUrl = await enqueue(async () => generateSpeech(text));
    res.json({ audioUrl });
  } catch (error) {
    console.error('[Voice] Failed to generate speech:', error);
    res.status(503).json({
      audioUrl: null,
      fallback: true,
      error: 'voice_unavailable',
    });
  }
}
