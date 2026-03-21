import { SpeechMetrics } from './types';

export function analyzeSpeech(answerText: string, audioMeta?: any): SpeechMetrics {
  // If we had actual audio blobs, we'd calculate latency/duration.
  // For now, we estimate based on text volume and simulated markers.
  
  const wordCount = answerText.split(/\s+/).length;
  
  // Approximate speech rate based on typical 130 wpm
  const estimatedDurationMinutes = wordCount / 130; 
  let speechRate = 130; 

  if (audioMeta?.duration) {
    // If frontend passed actual duration
    speechRate = Math.round((wordCount / audioMeta.duration) * 60);
  }

  // Determine confidence via fillers
  const fillerWords = (answerText.match(/\b(um|uh|like|you know|basically)\b/gi) || []).length;
  let confidenceSignal: 'low' | 'medium' | 'high' = 'high';
  if (fillerWords > 4) confidenceSignal = 'low';
  else if (fillerWords > 1) confidenceSignal = 'medium';

  // Fallback latency (avg 1-4s)
  const latency = audioMeta?.latency || parseFloat((Math.random() * 2 + 1.2).toFixed(1));

  return {
    latency,
    speechRate,
    confidenceSignal
  };
}
