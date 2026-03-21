import Groq from 'groq-sdk';
import { env } from '../config/env';
import { BehavioralMetrics } from './types';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export async function analyzeBehavioral(question: string, answer: string): Promise<BehavioralMetrics> {
  const systemPrompt = `Analyze the behavioral traits in this candidate's response on a scale of 0 to 10.
Traits to evaluate:
- Leadership
- Ownership
- Problem-solving
- Communication

Return ONLY valid JSON matching this exact structure:
{
  "leadership": number,
  "ownership": number,
  "problem_solving": number,
  "communication": number
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${question}\nCandidate Answer: ${answer}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content) as BehavioralMetrics;
  } catch (err) {
    console.error('[Analysis] Behavioral analysis failed:', err);
    return { leadership: 5, ownership: 5, problem_solving: 5, communication: 5 };
  }
}

export async function generateCoachingTip(question: string, answer: string): Promise<string> {
  const systemPrompt = `Give a short, actionable coaching tip (max 1 sentence) to improve this interview answer. Focus on one high-impact change.`;
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${question}\nCandidate Answer: ${answer}` }
      ],
      temperature: 0.5,
    });
    return response.choices[0]?.message?.content?.trim() || "Consider structuring your response with the STAR method.";
  } catch (err) {
    console.error('[Analysis] Coaching tip failed:', err);
    return "Consider structuring your response with the STAR method.";
  }
}
