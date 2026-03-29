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

export type ConfidenceSignal = 'low' | 'medium' | 'high' | 'unknown';

export interface SpeechMetrics {
  latency: number | null;
  speechRate: number | null;
  confidenceSignal: ConfidenceSignal;
  fillerWordCount: number;
}

export interface CoachingTip {
  tip: string;
}

export interface InterviewEvaluationRecord {
  phase: string;
  question: string;
  answer: string;
  evaluation: EvaluationResult;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  tip: string;
  createdAt: Date;
}

export interface AnalysisResponse {
  evaluation: EvaluationResult;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  tip: string;
}

export interface RecommendationItem {
  title: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium';
}

export interface QuestionReview {
  phase: string;
  question: string;
  answerPreview: string;
  scores: EvaluationScores;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  tip: string;
  strengths: string[];
  weaknesses: string[];
}

export interface FinalReport {
  overall_score: number;
  percentile: number | null;
  interview_count: number;
  completed_phases: string[];
  metrics: EvaluationScores;
  behavioral: BehavioralMetrics;
  speech: SpeechMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: RecommendationItem[];
  question_reviews: QuestionReview[];
  evidence_summary: {
    technical: string[];
    speaking: string[];
  };
}
