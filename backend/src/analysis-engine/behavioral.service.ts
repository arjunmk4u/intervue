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

Scoring rules:
- Only give high scores when the answer contains direct evidence for that trait.
- If the question is an introduction or background question, do NOT infer strong problem-solving, leadership, or ownership unless the answer explicitly demonstrates them.
- If a trait is not clearly evidenced, keep it in the 2 to 5 range.
- Communication can be judged from clarity and delivery, but the other traits must be evidence-based.

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
    const parsed = JSON.parse(content) as BehavioralMetrics;
    return calibrateBehavioralScores(question, answer, parsed);
  } catch (err) {
    console.error('[Analysis] Behavioral analysis failed:', err);
    return calibrateBehavioralScores(question, answer, { leadership: 5, ownership: 5, problem_solving: 5, communication: 5 });
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

function calibrateBehavioralScores(question: string, answer: string, scores: BehavioralMetrics): BehavioralMetrics {
  const questionType = classifyQuestion(question);
  const leadershipEvidence = countEvidence(answer, ['led', 'mentored', 'guided', 'managed', 'coordinated', 'owned the team', 'delegated', 'drove']);
  const ownershipEvidence = countEvidence(answer, ['owned', 'responsible', 'initiative', 'accountable', 'end-to-end', 'followed through', 'took charge']);
  const problemEvidence = countEvidence(answer, ['solved', 'debugged', 'fixed', 'issue', 'problem', 'challenge', 'root cause', 'trade-off', 'tradeoff', 'optimized', 'incident', 'bottleneck']);
  const communicationEvidence = countEvidence(answer, ['explained', 'communicated', 'collaborated', 'stakeholder', 'aligned', 'presented', 'discussed']);
  const answerWordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  return {
    leadership: calibrateTraitScore(scores.leadership, leadershipEvidence, questionType === 'leadership' ? 6 : 4),
    ownership: calibrateTraitScore(scores.ownership, ownershipEvidence, questionType === 'ownership' ? 6 : 4),
    problem_solving: calibrateTraitScore(scores.problem_solving, problemEvidence, questionType === 'problem_solving' ? 6 : 3),
    communication: calibrateCommunicationScore(scores.communication, communicationEvidence, answerWordCount),
  };
}

function classifyQuestion(question: string): 'intro' | 'leadership' | 'ownership' | 'problem_solving' | 'general' {
  const normalized = question.toLowerCase();

  if (
    normalized.includes('tell me about yourself') ||
    normalized.includes('walk me through your background') ||
    normalized.includes('introduce yourself') ||
    normalized.includes('your background')
  ) {
    return 'intro';
  }

  if (/(lead|mentor|manage|team|influence)/i.test(normalized)) {
    return 'leadership';
  }

  if (/(owner|ownership|initiative|accountable|responsibility|end-to-end)/i.test(normalized)) {
    return 'ownership';
  }

  if (/(problem|challenge|debug|issue|incident|tradeoff|trade-off|solve|failure|bottleneck)/i.test(normalized)) {
    return 'problem_solving';
  }

  return 'general';
}

function countEvidence(answer: string, keywords: string[]): number {
  const normalized = answer.toLowerCase();
  return keywords.reduce((count, keyword) => count + (normalized.includes(keyword) ? 1 : 0), 0);
}

function calibrateTraitScore(score: number, evidenceCount: number, noEvidenceCap: number): number {
  const normalizedScore = clampScore(score);

  if (evidenceCount === 0) {
    return Math.min(normalizedScore, noEvidenceCap);
  }

  if (evidenceCount === 1) {
    return Math.min(normalizedScore, 6);
  }

  return normalizedScore;
}

function calibrateCommunicationScore(score: number, evidenceCount: number, answerWordCount: number): number {
  const normalizedScore = clampScore(score);

  if (answerWordCount < 8) {
    return Math.min(normalizedScore, 4);
  }

  if (answerWordCount < 20) {
    return Math.min(normalizedScore, evidenceCount > 0 ? 6 : 5);
  }

  return normalizedScore;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score)));
}
