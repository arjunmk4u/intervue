import express from 'express';
import multer from 'multer';
import { env } from '../config/env';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': req.file.mimetype || 'audio/webm'
      },
      body: new Uint8Array(req.file.buffer)
    });

    if (!response.ok) {
      console.error('Deepgram error:', await response.text());
      return res.status(500).json({ error: 'Deepgram transcription failed' });
    }

    const data = await response.json();
    const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || '';
    
    res.json({ transcript });
  } catch (error) {
    console.error('Transcription route error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;
