import { Constants, EdgeTTS } from '@andresaya/edge-tts';

const DEFAULT_VOICE = 'en-US-JennyNeural';

export async function generateSpeech(text: string): Promise<Buffer> {
  const tts = new EdgeTTS();

  await tts.synthesize(humanizeText(text), DEFAULT_VOICE, {
    rate: '-8%',
    pitch: '-8Hz',
    volume: '90%',
    outputFormat: Constants.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  });

  const audioBuffer = await tts.toBuffer();
  return audioBuffer;
}

export function humanizeText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const conversational = rewriteForConversation(normalized);
  const segmented = splitLongSentences(conversational);

  return segmented
    .replace(/,\s*/g, ', ')
    .replace(/\.\s*/g, '. ')
    .replace(/\?\s*/g, '? ')
    .replace(/!\s*/g, '! ')
    .trim();
}

function rewriteForConversation(text: string): string {
  let spoken = text;

  spoken = spoken.replace(/^Describe\b/i, 'Can you walk me through');
  spoken = spoken.replace(/^Explain\b/i, 'Can you walk me through');
  spoken = spoken.replace(/^Share\b/i, 'Can you tell me about');
  spoken = spoken.replace(/^Discuss\b/i, 'Can you talk me through');
  spoken = spoken.replace(/^Tell me about\b/i, 'Can you tell me about');
  spoken = spoken.replace(/^What is\b/i, 'What would you say is');
  spoken = spoken.replace(/^How did you\b/i, 'How did you approach');

  // No longer prepending 'Alright' to questions as it feels repetitive.
  return spoken;
}

function splitLongSentences(text: string): string {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const result: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= 15) {
      result.push(sentence);
      continue;
    }

    const parts = sentence
      .split(/\s+(and|but|because|while|so)\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      result.push(sentence);
      continue;
    }

    let chunk = parts[0];
    for (let i = 1; i < parts.length; i += 2) {
      const connector = parts[i];
      const nextPart = parts[i + 1];
      if (!nextPart) break;

      if (`${chunk} ${connector} ${nextPart}`.split(/\s+/).length > 15) {
        result.push(chunk);
        chunk = `${connector.charAt(0).toUpperCase()}${connector.slice(1)} ${nextPart}`;
      } else {
        chunk = `${chunk} ${connector} ${nextPart}`;
      }
    }

    result.push(chunk);
  }

  return result.join(' ');
}