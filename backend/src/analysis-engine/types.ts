export interface EvaluationScores {
  clarity: number;
  depth: number;
  relevance: number;
  structure: number;
  confidence: number;
}

export interface EvaluationResult {
  scores: EvaluationScores;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface BehavioralMetrics {
  leadership: number;
  ownership: number;
  problem_solving: number;
  communication: number;
}

export interface SpeechMetrics {
  latency: number;
  speechRate: number;
  confidenceSignal: 'low' | 'medium' | 'high';
}

export interface CoachingTip {
  tip: string;
}

export interface AnalysisResponse {
  evaluation: EvaluationResult;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  tip: string;
}

export interface FinalReport {
  overall_score: number;
  percentile: number;
  metrics: EvaluationScores;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}
