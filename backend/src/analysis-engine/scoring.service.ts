import {
  BehavioralMetrics,
  EvaluationScores,
  FinalReport,
  InterviewEvaluationRecord,
  RecommendationItem,
  SpeechMetrics,
} from './types';

export function calculateOverallScore(evaluations: InterviewEvaluationRecord[]): FinalReport {
  if (!evaluations || evaluations.length === 0) {
    return {
      overall_score: 0,
      percentile: null,
      interview_count: 0,
      completed_phases: [],
      metrics: { clarity: 0, depth: 0, relevance: 0, structure: 0, confidence: 0 },
      behavioral: { leadership: 0, ownership: 0, problem_solving: 0, communication: 0 },
      speech: { latency: null, speechRate: null, confidenceSignal: 'unknown', fillerWordCount: 0 },
      strengths: [],
      weaknesses: [],
      recommendations: [],
      question_reviews: [],
      evidence_summary: {
        technical: [],
        speaking: [],
      },
    };
  }

  const metrics = averageEvaluationScores(evaluations);
  const behavioral = averageBehavioralScores(evaluations);
  const speech = averageSpeechScores(evaluations);
  const overallScore = deriveOverallScore(metrics, behavioral, speech);

  const strengths = uniqueStrings(evaluations.flatMap((entry) => entry.evaluation.strengths)).slice(0, 5);
  const weaknesses = uniqueStrings(evaluations.flatMap((entry) => entry.evaluation.weaknesses)).slice(0, 5);
  const recommendations = buildRecommendations(metrics, behavioral, speech, evaluations);
  const questionReviews = evaluations.map((entry) => ({
    phase: entry.phase,
    question: entry.question,
    answerPreview: truncate(entry.answer, 220),
    scores: entry.evaluation.scores,
    behavioral: entry.behavioral,
    speech: entry.speech,
    tip: entry.tip,
    strengths: entry.evaluation.strengths.slice(0, 2),
    weaknesses: entry.evaluation.weaknesses.slice(0, 2),
  }));

  return {
    overall_score: overallScore,
    percentile: null,
    interview_count: evaluations.length,
    completed_phases: Array.from(new Set(evaluations.map((entry) => entry.phase))),
    metrics,
    behavioral,
    speech,
    strengths,
    weaknesses,
    recommendations,
    question_reviews: questionReviews,
    evidence_summary: {
      technical: buildTechnicalEvidence(metrics, behavioral, evaluations),
      speaking: buildSpeakingEvidence(speech, evaluations),
    },
  };
}

function averageEvaluationScores(evaluations: InterviewEvaluationRecord[]): EvaluationScores {
  const totals = evaluations.reduce(
    (acc, entry) => {
      acc.clarity += entry.evaluation.scores.clarity;
      acc.depth += entry.evaluation.scores.depth;
      acc.relevance += entry.evaluation.scores.relevance;
      acc.structure += entry.evaluation.scores.structure;
      acc.confidence += entry.evaluation.scores.confidence;
      return acc;
    },
    { clarity: 0, depth: 0, relevance: 0, structure: 0, confidence: 0 }
  );

  return {
    clarity: average(totals.clarity, evaluations.length),
    depth: average(totals.depth, evaluations.length),
    relevance: average(totals.relevance, evaluations.length),
    structure: average(totals.structure, evaluations.length),
    confidence: average(totals.confidence, evaluations.length),
  };
}

function averageBehavioralScores(evaluations: InterviewEvaluationRecord[]): BehavioralMetrics {
  const totals = evaluations.reduce(
    (acc, entry) => {
      acc.leadership += entry.behavioral.leadership;
      acc.ownership += entry.behavioral.ownership;
      acc.problem_solving += entry.behavioral.problem_solving;
      acc.communication += entry.behavioral.communication;
      return acc;
    },
    { leadership: 0, ownership: 0, problem_solving: 0, communication: 0 }
  );

  return {
    leadership: average(totals.leadership, evaluations.length),
    ownership: average(totals.ownership, evaluations.length),
    problem_solving: average(totals.problem_solving, evaluations.length),
    communication: average(totals.communication, evaluations.length),
  };
}

function averageSpeechScores(evaluations: InterviewEvaluationRecord[]): SpeechMetrics {
  const measuredLatency = evaluations.map((entry) => entry.speech.latency).filter(isNumber);
  const measuredSpeechRate = evaluations.map((entry) => entry.speech.speechRate).filter(isNumber);
  const totalFillerWords = evaluations.reduce((sum, entry) => sum + (entry.speech.fillerWordCount || 0), 0);

  return {
    latency: measuredLatency.length ? average(sum(measuredLatency), measuredLatency.length) : null,
    speechRate: measuredSpeechRate.length ? average(sum(measuredSpeechRate), measuredSpeechRate.length) : null,
    confidenceSignal: deriveConfidenceSignal(evaluations),
    fillerWordCount: totalFillerWords,
  };
}

function deriveOverallScore(metrics: EvaluationScores, behavioral: BehavioralMetrics, speech: SpeechMetrics): number {
  const components: Array<{ score: number; weight: number }> = [
    { score: average(sum(Object.values(metrics)), Object.values(metrics).length), weight: 0.65 },
    { score: average(sum(Object.values(behavioral)), Object.values(behavioral).length), weight: 0.25 },
  ];

  const speakingScore = deriveSpeakingScore(speech);
  if (speakingScore !== null) {
    components.push({ score: speakingScore, weight: 0.1 });
  }

  const totalWeight = components.reduce((acc, item) => acc + item.weight, 0);
  const weightedAverage = components.reduce((acc, item) => acc + item.score * item.weight, 0) / totalWeight;

  return Math.round(weightedAverage * 10);
}

function deriveSpeakingScore(speech: SpeechMetrics): number | null {
  const parts: number[] = [];

  if (speech.latency !== null) {
    if (speech.latency <= 2.5) parts.push(8.5);
    else if (speech.latency <= 4) parts.push(7);
    else parts.push(5.5);
  }

  if (speech.speechRate !== null) {
    if (speech.speechRate >= 120 && speech.speechRate <= 160) parts.push(8.5);
    else if (speech.speechRate >= 100 && speech.speechRate <= 175) parts.push(7);
    else parts.push(5.5);
  }

  if (speech.confidenceSignal === 'high') parts.push(8.5);
  else if (speech.confidenceSignal === 'medium') parts.push(7);
  else if (speech.confidenceSignal === 'low') parts.push(5);

  return parts.length ? average(sum(parts), parts.length) : null;
}

function deriveConfidenceSignal(evaluations: InterviewEvaluationRecord[]): SpeechMetrics['confidenceSignal'] {
  const counts = evaluations.reduce(
    (acc, entry) => {
      acc[entry.speech.confidenceSignal] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0, unknown: 0 }
  );

  if (counts.high >= counts.medium && counts.high >= counts.low && counts.high > 0) return 'high';
  if (counts.medium >= counts.low && counts.medium > 0) return 'medium';
  if (counts.low > 0) return 'low';
  return 'unknown';
}

function buildRecommendations(
  metrics: EvaluationScores,
  behavioral: BehavioralMetrics,
  speech: SpeechMetrics,
  evaluations: InterviewEvaluationRecord[]
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  if (metrics.depth < 6.5) {
    recommendations.push({
      title: 'Go deeper technically',
      reason: `Depth averaged ${metrics.depth}/10 across the interview, which means answers often stopped before implementation detail or trade-offs.`,
      action: 'For each answer, add one layer on architecture, edge cases, debugging decisions, or trade-offs.',
      priority: 'high',
    });
  }

  if (metrics.structure < 6.5) {
    recommendations.push({
      title: 'Tighten answer structure',
      reason: `Structure averaged ${metrics.structure}/10, so your reasoning may have been harder to track end to end.`,
      action: 'Use a repeatable flow: context, approach, decision, outcome.',
      priority: 'high',
    });
  }

  if (metrics.relevance < 6.5) {
    recommendations.push({
      title: 'Answer the asked question first',
      reason: `Relevance averaged ${metrics.relevance}/10, which suggests some answers drifted away from the exact prompt.`,
      action: 'Open with the direct answer first, then expand with supporting detail.',
      priority: 'high',
    });
  }

  if (behavioral.problem_solving < 6.5) {
    recommendations.push({
      title: 'Show stronger problem-solving evidence',
      reason: `Problem-solving averaged ${behavioral.problem_solving}/10 based on the examples you gave.`,
      action: 'Describe the problem, your diagnosis, the fix, and the measurable result in each example.',
      priority: 'medium',
    });
  }

  if (speech.confidenceSignal === 'low') {
    recommendations.push({
      title: 'Reduce hesitation in delivery',
      reason: 'The recorded answers showed low speaking confidence based on transcript-level filler analysis.',
      action: 'Pause before technical points instead of speaking while thinking.',
      priority: 'medium',
    });
  }

  if (speech.speechRate !== null && (speech.speechRate < 110 || speech.speechRate > 170)) {
    recommendations.push({
      title: 'Adjust speaking pace',
      reason: `Measured speaking pace averaged ${speech.speechRate} wpm, which is outside the most comfortable interview range.`,
      action: 'Practice concise technical explanations at a steady pace so details stay understandable.',
      priority: 'medium',
    });
  }

  const storedTips = uniqueStrings(evaluations.map((entry) => entry.tip)).slice(0, 2);
  storedTips.forEach((tip, index) => {
    recommendations.push({
      title: `Interview coaching note ${index + 1}`,
      reason: 'This was generated during the live interview from one of your actual answers.',
      action: tip,
      priority: 'medium',
    });
  });

  return uniqueRecommendations(recommendations).slice(0, 6);
}

function buildTechnicalEvidence(
  metrics: EvaluationScores,
  behavioral: BehavioralMetrics,
  evaluations: InterviewEvaluationRecord[]
): string[] {
  const evidence: string[] = [];

  if (metrics.depth >= 7) evidence.push(`Depth stayed relatively strong at ${metrics.depth}/10 across answered questions.`);
  if (metrics.depth < 6.5) evidence.push(`Depth averaged ${metrics.depth}/10, showing room for more implementation detail and trade-off discussion.`);
  if (metrics.relevance < 6.5) evidence.push(`Relevance averaged ${metrics.relevance}/10, so some answers likely drifted from the exact question being asked.`);
  if (metrics.structure < 6.5) evidence.push(`Structure averaged ${metrics.structure}/10, which suggests answers could be more organized from start to finish.`);
  if (behavioral.problem_solving < 6.5) evidence.push(`Problem-solving evidence averaged ${behavioral.problem_solving}/10 based on the concrete examples used in the interview.`);

  const specificWeaknesses = uniqueStrings(evaluations.flatMap((entry) => entry.evaluation.weaknesses)).slice(0, 3);
  evidence.push(...specificWeaknesses);

  return evidence.slice(0, 5);
}

function buildSpeakingEvidence(speech: SpeechMetrics, evaluations: InterviewEvaluationRecord[]): string[] {
  const evidence: string[] = [];

  if (speech.latency !== null) {
    evidence.push(`Average answer start latency was ${speech.latency}s based on recorded responses.`);
  }

  if (speech.speechRate !== null) {
    evidence.push(`Average speaking rate was ${speech.speechRate} wpm across measured answers.`);
  }

  if (speech.confidenceSignal !== 'unknown') {
    evidence.push(`Speaking confidence was assessed as ${speech.confidenceSignal} from the captured interview transcripts.`);
  }

  if (speech.fillerWordCount > 0) {
    evidence.push(`Detected ${speech.fillerWordCount} filler-word instances across the interview transcript.`);
  }

  const speechRelatedWeaknesses = uniqueStrings(
    evaluations
      .flatMap((entry) => entry.evaluation.weaknesses)
      .filter((item) => /communicat|clar|confidence|polished/i.test(item))
  );
  evidence.push(...speechRelatedWeaknesses.slice(0, 2));

  return evidence.slice(0, 5);
}

function uniqueRecommendations(recommendations: RecommendationItem[]): RecommendationItem[] {
  const seen = new Set<string>();
  return recommendations.filter((item) => {
    const key = `${item.title}|${item.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function average(total: number, count: number): number {
  if (!count) return 0;
  return Number((total / count).toFixed(1));
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function isNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
