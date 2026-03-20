import { Request, Response } from 'express';
import { env } from '../config/env';

export async function getAvatarToken(req: Request, res: Response) {
  try {
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': env.HEYGEN_API_KEY
      }
    });

    if (!response.ok) {
      console.error('HeyGen API Error:', await response.text());
      return res.status(500).json({ error: 'Failed to create HeyGen payload token' });
    }

    const data = await response.json();
    // Heygen returns { data: { token: "..." } } structure
    res.json({ token: data.data.token });
  } catch (error) {
    console.error('Avatar token controller error:', error);
    res.status(500).json({ error: 'Failed to process avatar token fetch' });
  }
}
