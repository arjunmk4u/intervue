import { env } from '../config/env';

// Gemini TTS voice — "Aoede" is warm, natural, female (closest to Gemini assistant voice)
// Other options: Kore (firm female), Charon (deep male), Puck (upbeat male), Fenrir (energetic male)
const VOICE_NAME = 'Aoede';

// Gemini TTS model — free tier, fast, high quality
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * Generate speech via Gemini TTS API.
 * Returns a WAV audio Buffer (PCM → WAV conversion included).
 */
export async function generateGeminiSpeech(text: string): Promise<Buffer | null> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini TTS] No API key configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: VOICE_NAME },
              },
            },
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    console.log(`[Gemini TTS] Completed in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      const err = await response.text();
      console.error('[Gemini TTS] API error:', response.status, err);
      return null;
    }

    const data = await response.json();
    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.error('[Gemini TTS] No audio data in response');
      return null;
    }

    // Gemini returns raw 24kHz 16-bit mono PCM — wrap it in a WAV container
    const pcm = Buffer.from(b64, 'base64');
    return pcmToWav(pcm, 24000, 1, 16);

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[Gemini TTS] Timed out after 10s');
    } else {
      console.error('[Gemini TTS] Request failed:', error.message);
    }
    return null;
  }
}

/**
 * Wrap raw PCM bytes in a RIFF WAV header so browsers can play it.
 */
function pcmToWav(pcm: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);           // PCM chunk size
  header.writeUInt16LE(1, 20);            // AudioFormat = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}
