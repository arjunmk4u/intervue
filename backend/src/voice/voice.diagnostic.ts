import { Request, Response } from 'express';
import crypto from 'crypto';
import { EdgeTTS } from '@andresaya/edge-tts';
import { env } from '../config/env';

const DIAGNOSTIC_TIMEOUT_MS = 6000;

function safeCompare(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const hashProvided = crypto.createHash('sha256').update(provided).digest();
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashProvided, hashExpected);
}

export async function voiceUpstreamDiagnosticController(req: Request, res: Response): Promise<void> {
  const configuredToken = env.VOICE_DIAGNOSTIC_TOKEN;

  // Diagnostic is disabled when the secret token is not configured in the environment
  if (!configuredToken) {
    res.status(404).end();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(404).end();
    return;
  }

  const providedToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!safeCompare(providedToken, configuredToken)) {
    res.status(404).end();
    return;
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    const tts = new EdgeTTS();

    // getVoices() in @andresaya/edge-tts@1.9.1 takes no arguments and does not support cancellation.
    // The response timeout returns to the client after DIAGNOSTIC_TIMEOUT_MS, but the
    // underlying HTTPS request runs until completion or socket close.
    const voicesPromise = tts.getVoices().then((voices) => voices.length);

    // Prevent unhandled rejection if the underlying request rejects after the timeout fires
    voicesPromise.catch(() => {});

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), DIAGNOSTIC_TIMEOUT_MS);
    });

    const voiceCount = await Promise.race([voicesPromise, timeoutPromise]);

    res.status(200).json({ ok: true, voiceCount });
  } catch {
    console.error('[Voice Diagnostics] Upstream voice-list check failed or timed out');
    res.status(502).json({ ok: false, error: 'upstream_request_failed' });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
