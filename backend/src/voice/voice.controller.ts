import { Request, Response } from 'express';
import { enqueue } from './voice.queue';
import { generateSpeechStream } from './tts.service';

export async function speakController(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-store');

  try {
    await enqueue(async () => {
      const stream = generateSpeechStream(text);
      for await (const chunk of stream) {
        res.write(chunk);
      }
      res.end();
    });
  } catch (error) {
    console.error('[Voice] Failed to generate speech stream:', error);
    if (!res.headersSent) {
      res.status(503).json({
        error: error instanceof Error ? error.message : 'voice_unavailable',
      });
    } else {
      res.end();
    }
  }
}
