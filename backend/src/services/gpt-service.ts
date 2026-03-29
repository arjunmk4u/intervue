import Groq from 'groq-sdk';
import { ISession } from '../models/Session';
import { IResumeData } from '../models/Resume';
import { buildSystemPrompt } from '../interview-engine/prompt-builder';
import { env } from '../config/env';

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

function sanitizeInterviewerResponse(content: string): string {
  let sanitized = content;

  const fillerWords = ['Alright', 'Great', 'Okay', 'I understand', 'Sure', 'Wonderful', 'Excellent', 'Fantastic', 'Nice', 'Good'];
  const fillerRegex = new RegExp(`^(${fillerWords.join('|')})[\\s,!.]+`, 'i');

  while (fillerRegex.test(sanitized)) {
    sanitized = sanitized.replace(fillerRegex, '').trim();
  }

  if (sanitized.length > 0) {
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  return sanitized;
}

export async function generateNextQuestion(session: ISession, resumeData: IResumeData | null): Promise<string> {
  const systemPrompt = buildSystemPrompt(session, resumeData);

  // keep only last 4 messages to save context (2 user, 2 assistant)
  const recentHistory = session.history.slice(-4).map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory
  ];

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
    });

    const content = sanitizeInterviewerResponse(
      response.choices[0]?.message?.content || 'Could you tell me more about that?',
    );

    return content || "Could you tell me more about that?";
  } catch (error) {
    console.error("Groq API Error generating question:", error);
    return "I'm having a little trouble processing that. Could you please elaborate on your last point?";
  }
}

export async function generateClosingMessage(session: ISession): Promise<string> {
  const messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `You are wrapping up a live interview as the interviewer.

Write a short, natural closing message based on the conversation so far.

Rules:
1. Sound personalized to the candidate's actual interview, not generic.
2. Briefly acknowledge 1-2 themes from their answers without scoring or judging them.
3. Do not invent specifics that were not discussed.
4. Do not ask another interview question.
5. Do not mention being an AI.
6. Do not overpraise or provide a detailed assessment.
7. Mention that their assessment/report is being prepared and they will see it shortly.
8. Keep it to 2-4 sentences.
9. Do not start with filler like "Alright", "Great", or "Okay".`,
    },
    ...session.history.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.5,
    });

    const content = sanitizeInterviewerResponse(
      response.choices[0]?.message?.content ||
      'That concludes the interview. I am preparing your assessment now, and it will be ready shortly.',
    );

    return content || 'That concludes the interview. I am preparing your assessment now, and it will be ready shortly.';
  } catch (error) {
    console.error('Groq API Error generating closing message:', error);
    return 'That concludes the interview. I am preparing your assessment now, and it will be ready shortly.';
  }
}
