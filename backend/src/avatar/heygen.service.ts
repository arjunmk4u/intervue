import { env } from '../config/env';

// Mock TTS generation, returning a base64 string or an audio url
async function generateTTS(text: string): Promise<string> {
  // Normally this would call Deepgram or ElevenLabs API
  // Returning a dummy payload for now since actual TTS implementation is out of scope 
  // without knowing exact models, but could be easily added if keys are active
  return "data:audio/mp3;base64,..."; 
}

export async function speakWithAvatar(text: string) {
  // 1. Generate TTS audio
  const audio = await generateTTS(text);

  try {
    // 2. Send to HeyGen
    const response = await fetch("https://api.heygen.com/v1/stream", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HEYGEN_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audio })
    });

    if (!response.ok) {
      console.error('HeyGen API Error:', await response.text());
      return { streamUrl: "dummy-url", sessionId: "dummy-session", fallback: true };
    }

    return response.json();
  } catch (error) {
    console.error('Failed to communicate with HeyGen:', error);
    // Return fallback info instead of crashing the flow if HeyGen key is invalid initially
    return { streamUrl: "error-url", sessionId: "error-session", fallback: true };
  }
}
