import Groq from 'groq-sdk';
import { ISession } from '../models/Session';
import { IResumeData } from '../models/Resume';
import { buildSystemPrompt } from '../interview-engine/prompt-builder';
import { env } from '../config/env';

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

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

    let content = response.choices[0]?.message?.content || "Could you tell me more about that?";
    
    // Post-processing to remove "Alright", "Great", "Okay", etc. at the start
    const fillerWords = ['Alright', 'Great', 'Okay', 'I understand', 'Sure', 'Wonderful', 'Excellent', 'Fantastic', 'Nice', 'Good'];
    const fillerRegex = new RegExp(`^(${fillerWords.join('|')})[\\s,!.]+`, 'i');
    
    // Loop to remove multiple consecutive fillers
    while (fillerRegex.test(content)) {
      content = content.replace(fillerRegex, '').trim();
    }

    // Ensure first letter is capitalized
    if (content.length > 0) {
      content = content.charAt(0).toUpperCase() + content.slice(1);
    }

    return content || "Could you tell me more about that?";
  } catch (error) {
    console.error("Groq API Error generating question:", error);
    return "I'm having a little trouble processing that. Could you please elaborate on your last point?";
  }
}
