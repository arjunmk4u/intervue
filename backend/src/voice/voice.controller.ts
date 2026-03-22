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
    const audioBuffer = await enqueue(async () => generateSpeech(text));

    res.json({
      audioUrl: null, // No file storage, so no URL
      audioBase64: audioBuffer.toString('base64'),
      mimeType: 'audio/mpeg',
    });
  } catch (error) {
    console.error('[Voice] Failed to generate speech:', error);
    res.status(503).json({
      audioUrl: null,
      audioBase64: null,
      fallback: true,
      error: error instanceof Error ? error.message : 'voice_unavailable',
    });
  }
}
