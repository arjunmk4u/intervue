import { EvaluationResult, BehavioralMetrics, SpeechMetrics, FinalReport } from './types';

export function calculateOverallScore(
  evaluations: { evaluation: EvaluationResult; behavioral: BehavioralMetrics; speech: SpeechMetrics }[]
): FinalReport {
  if (!evaluations || evaluations.length === 0) {
    return {
      overall_score: 0,
      percentile: 0,
      metrics: { clarity: 0, depth: 0, relevance: 0, structure: 0, confidence: 0 },
      behavioral: { leadership: 0, ownership: 0, problem_solving: 0, communication: 0 },
      speech: { latency: 0, speechRate: 0, confidenceSignal: 'medium' },
      strengths: [],
      weaknesses: [],
      suggestions: []
    };
  }

  const numEvals = evaluations.length;
  
  // Aggregate Evaluation Scores
  let clarityAvg = 0, depthAvg = 0, relevanceAvg = 0, structureAvg = 0, confidenceAvg = 0;
  // Aggregate Behavioral
  let leadershipAvg = 0, ownershipAvg = 0, probAvg = 0, commAvg = 0;
  // Aggregate Speech
  let latencyAvg = 0, speechRateAvg = 0;

  const allSuggestions = new Set<string>();
  const highSignalStrengths: string[] = [];
  const highSignalWeaknesses: string[] = [];

  evaluations.forEach(ev => {
    clarityAvg += ev.evaluation.scores.clarity;
    depthAvg += ev.evaluation.scores.depth;
    relevanceAvg += ev.evaluation.scores.relevance;
    structureAvg += ev.evaluation.scores.structure;
    confidenceAvg += ev.evaluation.scores.confidence;

    leadershipAvg += ev.behavioral.leadership;
    ownershipAvg += ev.behavioral.ownership;
    probAvg += ev.behavioral.problem_solving;
    commAvg += ev.behavioral.communication;

    latencyAvg += ev.speech.latency;
    speechRateAvg += ev.speech.speechRate;

    ev.evaluation.suggestions.forEach(s => allSuggestions.add(s));
  });

  const aggregateEvaluation = {
    clarity: parseFloat((clarityAvg / numEvals).toFixed(1)),
    depth: parseFloat((depthAvg / numEvals).toFixed(1)),
    relevance: parseFloat((relevanceAvg / numEvals).toFixed(1)),
    structure: parseFloat((structureAvg / numEvals).toFixed(1)),
    confidence: parseFloat((confidenceAvg / numEvals).toFixed(1))
  };

  const aggregateBehavioral = {
    leadership: parseFloat((leadershipAvg / numEvals).toFixed(1)),
    ownership: parseFloat((ownershipAvg / numEvals).toFixed(1)),
    problem_solving: parseFloat((probAvg / numEvals).toFixed(1)),
    communication: parseFloat((commAvg / numEvals).toFixed(1))
  };

  const aggregateSpeech = {
    latency: parseFloat((latencyAvg / numEvals).toFixed(1)),
    speechRate: parseFloat((speechRateAvg / numEvals).toFixed(1)),
    confidenceSignal: deriveConfidenceSignal(confidenceAvg / numEvals, speechRateAvg / numEvals) as 'high' | 'medium' | 'low'
  };

  // Base score on semantic (60%) + behavioral (30%) + speech confidence (10%)
  const pureSemanticAvg = (aggregateEvaluation.clarity + aggregateEvaluation.depth + aggregateEvaluation.relevance + aggregateEvaluation.structure + aggregateEvaluation.confidence) / 5;
  const pureBehavioralAvg = (aggregateBehavioral.leadership + aggregateBehavioral.ownership + aggregateBehavioral.problem_solving + aggregateBehavioral.communication) / 4;
  
  const semanticPoints = (pureSemanticAvg / 10) * 60;
  const behavioralPoints = (pureBehavioralAvg / 10) * 30;
  // Let's assume baseline 8 points for speech, latency < 3s gives +2
  const speechPoints = (aggregateSpeech.latency < 3 ? 10 : 7);

  const rawScore = Math.round(semanticPoints + behavioralPoints + speechPoints);

  // Derive a "Percentile" relative to the raw score using a rough statistical bell curve map
  // 90+ = 98th, 80-89 = 80-92th, 70-79 = 50-75th
  let percentile = rawScore;
  if(rawScore >= 85) percentile = Math.min(99, rawScore + 5);
  else if (rawScore < 60) percentile = rawScore - 10;

  collectAggregateInsights(aggregateEvaluation, aggregateBehavioral, highSignalStrengths, highSignalWeaknesses);

  const fallbackStrengths = evaluations.flatMap((ev) => ev.evaluation.strengths);
  const fallbackWeaknesses = evaluations.flatMap((ev) => ev.evaluation.weaknesses);

  const topStrengths = uniqueStrings([...highSignalStrengths, ...fallbackStrengths]).slice(0, 4);
  const topWeaknesses = uniqueStrings([...highSignalWeaknesses, ...fallbackWeaknesses]).slice(0, 3);
  const topSuggestions = Array.from(allSuggestions).slice(0, 3);

  return {
    overall_score: rawScore,
    percentile,
    metrics: aggregateEvaluation,
    behavioral: aggregateBehavioral,
    speech: aggregateSpeech,
    strengths: topStrengths,
    weaknesses: topWeaknesses,
    suggestions: topSuggestions
  };
}

function collectAggregateInsights(
  evaluation: FinalReport['metrics'],
  behavioral: FinalReport['behavioral'],
  strengths: string[],
  weaknesses: string[]
) {
  if (evaluation.clarity >= 7.5) strengths.push('Your answers were clear and easy to follow.');
  if (evaluation.structure >= 7.5) strengths.push('You structured responses in a disciplined way.');
  if (evaluation.relevance >= 7.5) strengths.push('You stayed aligned with what the question was asking.');
  if (evaluation.depth >= 7.5) strengths.push('You added meaningful detail instead of staying superficial.');
  if (behavioral.communication >= 7.5) strengths.push('You communicated ideas in a calm, professional manner.');
  if (behavioral.problem_solving >= 7.5) strengths.push('You showed credible problem-solving only when concrete examples supported it.');

  if (evaluation.clarity <= 5.5) weaknesses.push('Some answers needed clearer wording and sharper takeaways.');
  if (evaluation.structure <= 5.5) weaknesses.push('Response structure was inconsistent and could be more organized.');
  if (evaluation.depth <= 5.5) weaknesses.push('Several answers needed more depth, specifics, or technical detail.');
  if (evaluation.relevance <= 5.5) weaknesses.push('A few responses drifted away from the core question.');
  if (behavioral.communication <= 5.5) weaknesses.push('Communication felt less polished than it could be under interview pressure.');
  if (behavioral.problem_solving <= 4.5) weaknesses.push('Problem-solving evidence was limited or not clearly demonstrated in your examples.');
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function deriveConfidenceSignal(confidenceScore: number, speechRate: number): 'high' | 'medium' | 'low' {
  if (confidenceScore >= 7.5 && speechRate >= 110 && speechRate <= 165) return 'high';
  if (confidenceScore >= 5.5) return 'medium';
  return 'low';
}
