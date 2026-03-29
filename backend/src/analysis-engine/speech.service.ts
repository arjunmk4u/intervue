import { SpeechMetrics } from './types';

interface AudioMeta {
  duration?: number | null;
  latency?: number | null;
}

export function analyzeSpeech(answerText: string, audioMeta?: AudioMeta): SpeechMetrics {
  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  const fillerWordCount = (answerText.match(/\b(um|uh|like|you know|basically)\b/gi) || []).length;

  let confidenceSignal: SpeechMetrics['confidenceSignal'] = 'high';
  if (fillerWordCount > 4) confidenceSignal = 'low';
  else if (fillerWordCount > 1) confidenceSignal = 'medium';

  const duration = typeof audioMeta?.duration === 'number' && audioMeta.duration > 0 ? audioMeta.duration : null;
  const latency = typeof audioMeta?.latency === 'number' && audioMeta.latency >= 0 ? Number(audioMeta.latency.toFixed(1)) : null;
  const speechRate = duration ? Math.round((wordCount / duration) * 60) : null;

  if (duration === null && confidenceSignal === 'high' && fillerWordCount === 0) {
    confidenceSignal = 'unknown';
  }

  return {
    latency,
    speechRate,
    confidenceSignal,
    fillerWordCount,
  };
}
