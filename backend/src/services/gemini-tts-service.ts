import { env } from '../config/env';

const VOICE_NAME = 'Aoede';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

type GeminiTtsSuccess = {
  ok: true;
  audioBuffer: Buffer;
  model: string;
};

type GeminiTtsFailure = {
  ok: false;
  model: string;
  reason: 'no_api_key' | 'quota_exhausted' | 'no_audio' | 'request_failed';
  message: string;
  retryAfterMs?: number;
  statusCode?: number;
};

export type GeminiTtsResult = GeminiTtsSuccess | GeminiTtsFailure;

export async function generateGeminiSpeech(text: string): Promise<GeminiTtsResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini TTS] No API key configured');
    return {
      ok: false,
      model: TTS_MODEL,
      reason: 'no_api_key',
      message: 'Gemini API key is not configured.',
      statusCode: 503,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
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
      const errorText = await response.text();
      console.error('[Gemini TTS] API error:', response.status, errorText);

      return {
        ok: false,
        model: TTS_MODEL,
        reason: response.status === 429 ? 'quota_exhausted' : 'request_failed',
        message: extractErrorMessage(errorText) || `Gemini TTS request failed with ${response.status}.`,
        retryAfterMs: parseRetryDelayMs(errorText),
        statusCode: response.status,
      };
    }

    const data = await response.json();
    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.error('[Gemini TTS] No audio data in response', JSON.stringify(data));
      return {
        ok: false,
        model: TTS_MODEL,
        reason: 'no_audio',
        message: 'Gemini TTS returned no audio payload.',
        statusCode: 503,
      };
    }

    const pcm = Buffer.from(b64, 'base64');
    return {
      ok: true,
      model: TTS_MODEL,
      audioBuffer: pcmToWav(pcm, 24000, 1, 16),
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Gemini TTS] Timed out after 10s');
      return {
        ok: false,
        model: TTS_MODEL,
        reason: 'request_failed',
        message: 'Gemini TTS timed out after 10 seconds.',
        statusCode: 504,
      };
    }

    const message = error instanceof Error ? error.message : 'Unknown Gemini TTS error';
    console.error('[Gemini TTS] Request failed:', message);

    return {
      ok: false,
      model: TTS_MODEL,
      reason: 'request_failed',
      message,
      statusCode: 503,
    };
  }
}

function extractErrorMessage(errorText: string): string | null {
  try {
    const parsed = JSON.parse(errorText);
    return parsed?.error?.message || null;
  } catch {
    return errorText || null;
  }
}

function parseRetryDelayMs(errorText: string): number | undefined {
  try {
    const parsed = JSON.parse(errorText);
    const retryInfo = parsed?.error?.details?.find(
      (detail: { '@type'?: string; retryDelay?: string }) =>
        detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );

    if (typeof retryInfo?.retryDelay === 'string') {
      const seconds = Number.parseFloat(retryInfo.retryDelay.replace('s', ''));
      if (!Number.isNaN(seconds)) {
        return Math.ceil(seconds * 1000);
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function pcmToWav(pcm: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}
