import Groq from 'groq-sdk';
import { env } from '../config/env';
import { EvaluationResult } from './types';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export async function evaluateResponse(question: string, answer: string): Promise<EvaluationResult> {
  const systemPrompt = `You are an expert technical interviewer.
Evaluate the candidate's response based on:
1. Clarity (0-10)
2. Depth (0-10)
3. Relevance (0-10)
4. Structure (0-10)
5. Confidence (0-10, based on language)

Also extract:
- 2 strengths
- 2 weaknesses
- 2 improvement suggestions

Return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:
{
  "scores": {
    "clarity": number,
    "depth": number,
    "relevance": number,
    "structure": number,
    "confidence": number
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": ["...", "..."]
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
    return JSON.parse(content) as EvaluationResult;
  } catch (err) {
    console.error('[Analysis] Evaluation failed:', err);
    // Return sensible defaults if LLM fails
    return {
      scores: { clarity: 5, depth: 5, relevance: 5, structure: 5, confidence: 5 },
      strengths: ["Attempted to answer the prompt"],
      weaknesses: ["Response lacked clear definition"],
      suggestions: ["Try to structure the response better"]
    };
  }
}
