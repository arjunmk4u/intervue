'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RecommendationItem {
  title: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium';
}

interface QuestionReview {
  phase: string;
  question: string;
  answerPreview: string;
  scores: { clarity: number; depth: number; relevance: number; structure: number; confidence: number };
  behavioral: { leadership: number; ownership: number; problem_solving: number; communication: number };
  speech: { latency: number | null; speechRate: number | null; confidenceSignal: string; fillerWordCount: number };
  tip: string;
  strengths: string[];
  weaknesses: string[];
}

interface FinalReport {
  overall_score: number;
  interview_count: number;
  completed_phases?: string[];
  metrics?: { clarity: number; depth: number; relevance: number; structure: number; confidence: number };
  behavioral?: { leadership: number; ownership: number; problem_solving: number; communication: number };
  speech?: { latency: number | null; speechRate: number | null; confidenceSignal: string; fillerWordCount: number };
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: RecommendationItem[];
  question_reviews?: QuestionReview[];
  evidence_summary?: {
    technical: string[];
    speaking: string[];
  };
}

interface ReportErrorResponse {
  error: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function AnalyticsDashboard() {
  return (
    <Suspense fallback={<AnalyticsLoadingState />}>
      <AnalyticsDashboardContent />
    </Suspense>
  );
}

function AnalyticsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sessionId = searchParams?.get('sessionId');
    if (!sessionId) {
      sessionId = localStorage.getItem('sessionId');
    }

    if (!sessionId) {
      router.push('/');
      return;
    }

    const fetchReport = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/final-report?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        if (isReportErrorResponse(data)) {
          setReport(null);
        } else {
          setReport(data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [router, searchParams]);

  if (loading) return <AnalyticsLoadingState />;

  if (!report || !Number.isFinite(report.interview_count) || report.interview_count === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0E14] px-6 text-center text-slate-200">
        <h2 className="text-2xl font-bold text-white">Assessment Unavailable</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This report only appears after at least one analyzed interview answer has been saved.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0B0E14] transition hover:bg-slate-200"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const completedPhases = Array.isArray(report.completed_phases) ? report.completed_phases.filter(Boolean) : [];
  const metrics = normalizeMetrics(report.metrics);
  const behavioral = normalizeBehavioral(report.behavioral);
  const speech = normalizeSpeech(report.speech);
  const strengths = Array.isArray(report.strengths) ? report.strengths.filter(Boolean) : [];
  const weaknesses = Array.isArray(report.weaknesses) ? report.weaknesses.filter(Boolean) : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations.filter(isRecommendationItem) : [];
  const questionReviews = Array.isArray(report.question_reviews) ? report.question_reviews.filter(isQuestionReview) : [];
  const evidenceSummary = normalizeEvidenceSummary(report.evidence_summary);

  return (
    <main className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[420px] bg-gradient-to-b from-indigo-900/20 via-[#0B0E14] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-15%] left-[-8%] h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[18%] right-[-12%] h-[520px] w-[520px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-6 md:px-12 md:py-8">
        <header className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 px-6 py-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Session-Based Assessment
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Interview evidence report
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
                Every score and recommendation below comes from the interview answers saved in this session. No percentile ranking, no placeholder coaching, and no guessed performance data.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-slate-700/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-white/5 hover:text-white"
              >
                New Session
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryChip label="Answers Analyzed" value={String(report.interview_count)} />
            <SummaryChip label="Phases Covered" value={completedPhases.join(', ') || 'none'} />
            <SummaryChip label="Overall Score" value={`${report.overall_score}/100`} />
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Clarity" value={metrics.clarity} suffix="/ 10" tone={getMetricTone(metrics.clarity)} toneClass="indigo" accent />
          <StatCard label="Depth" value={metrics.depth} suffix="/ 10" tone={getMetricTone(metrics.depth)} toneClass="emerald" />
          <StatCard label="Relevance" value={metrics.relevance} suffix="/ 10" tone={getMetricTone(metrics.relevance)} toneClass="cyan" />
          <StatCard label="Problem Solving" value={behavioral.problem_solving} suffix="/ 10" tone={getMetricTone(behavioral.problem_solving)} toneClass="amber" />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Panel
              eyebrow="Technical Signals"
              title="Measured answer quality"
              body={
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Object.entries(metrics).map(([key, value]) => (
                    <MetricMeter key={key} label={key.replace('_', ' ')} value={value} />
                  ))}
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <InsightCard title="Repeated strengths" label="Strengths" tone="emerald" items={strengths} emptyMessage="No repeated strengths were extracted from the analyzed answers." />
              <InsightCard title="Repeated weaknesses" label="Weaknesses" tone="rose" items={weaknesses} emptyMessage="No repeated weaknesses were extracted from the analyzed answers." />
            </div>

            <Panel
              eyebrow="Question Reviews"
              title="Per-answer breakdown"
              body={
                <div className="space-y-4">
                  {questionReviews.length > 0 ? questionReviews.map((review, index) => (
                    <div key={`${review.phase}-${index}`} className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/70 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="inline-flex rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            {review.phase}
                          </div>
                          <h3 className="mt-3 text-base font-bold text-white">{review.question}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-right text-sm text-slate-400">
                          <span>clarity {review.scores.clarity}</span>
                          <span>depth {review.scores.depth}</span>
                          <span>relevance {review.scores.relevance}</span>
                          <span>confidence {review.scores.confidence}</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.25rem] border border-slate-800/70 bg-[#13161F]/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Your Answer</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.answerPreview}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ReviewList title="Worked well" items={review.strengths} emptyMessage="No positive evidence stored for this answer." />
                        <ReviewList title="Needs work" items={review.weaknesses} emptyMessage="No weaknesses stored for this answer." />
                      </div>

                      {review.tip ? (
                        <div className="mt-4 rounded-[1.25rem] border border-indigo-500/20 bg-indigo-500/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Saved coaching note</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-200">{review.tip}</p>
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="text-sm text-slate-500">No per-answer reviews were available for this session.</p>}
                </div>
              }
            />
          </div>

          <aside className="space-y-6">
            <Panel
              eyebrow="Recommendation Engine"
              title="Next improvements"
              body={
                <div className="space-y-4">
                  {recommendations.length > 0 ? recommendations.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-[1.4rem] border border-slate-800/80 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-white">{item.title}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${item.priority === 'high' ? 'bg-rose-500/15 text-rose-300' : 'bg-indigo-500/15 text-indigo-300'}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.reason}</p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-200">{item.action}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No saved recommendations were available for this session.</p>}
                </div>
              }
            />

            <Panel
              eyebrow="Speaking Evidence"
              title="Measured delivery"
              body={
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SpeechStat label="Latency" value={formatOptionalMetric(speech.latency, 's')} />
                    <SpeechStat label="Speech Rate" value={formatOptionalMetric(speech.speechRate, 'wpm')} />
                  </div>
                  <SpeechStat label="Confidence Signal" value={speech.confidenceSignal} />
                  <SpeechStat label="Filler Words" value={String(speech.fillerWordCount)} />
                  <ReviewList title="Speaking findings" items={evidenceSummary.speaking} emptyMessage="No speaking evidence was captured for this session." />
                </div>
              }
            />

            <Panel
              eyebrow="Technical Evidence"
              title="Why these recommendations exist"
              body={<ReviewList title="Derived from saved answers" items={evidenceSummary.technical} emptyMessage="No technical evidence was available." />}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function AnalyticsLoadingState() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B0E14]">
      <div className="h-10 w-10 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin"></div>
    </div>
  );
}

function Panel({ eyebrow, title, body }: { eyebrow: string; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-[#13161F]/90 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
      <div className="mt-6">{body}</div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-800/70 bg-[#13161F]/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
  toneClass,
  accent = false,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: string;
  toneClass: 'emerald' | 'indigo' | 'cyan' | 'amber';
  accent?: boolean;
}) {
  const toneStyles = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  }[toneClass];

  return (
    <div className="rounded-[1.75rem] border border-slate-800/70 bg-[#13161F]/85 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <div className="mt-4 flex items-end gap-2">
        <span className={accent ? 'bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-5xl font-extrabold text-transparent' : 'text-5xl font-extrabold text-white'}>
          {value}
        </span>
        <span className="pb-1 text-sm font-medium text-slate-500">{suffix}</span>
      </div>
      <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${toneStyles}`}>
        {tone}
      </div>
    </div>
  );
}

function MetricMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold capitalize text-slate-300">{label}</span>
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${Math.max(8, Math.min(100, value * 10))}%` }} />
      </div>
    </div>
  );
}

function InsightCard({
  title,
  label,
  emptyMessage,
  tone,
  items,
}: {
  title: string;
  label: string;
  emptyMessage: string;
  tone: 'emerald' | 'rose';
  items: string[];
}) {
  const toneStyles = {
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-300',
      label: 'text-emerald-300',
      card: 'border-emerald-500/10 bg-emerald-500/[0.06]',
    },
    rose: {
      badge: 'bg-rose-500/10 text-rose-300',
      label: 'text-rose-300',
      card: 'border-rose-500/10 bg-rose-500/[0.06]',
    },
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-[#13161F]/90 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${toneStyles.badge}`}></div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${toneStyles.label}`}>{label}</p>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {items?.length > 0 ? items.map((item, i) => (
          <div key={i} className={`rounded-[1.25rem] border p-4 text-sm leading-relaxed text-slate-300 ${toneStyles.card}`}>
            {item}
          </div>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

function ReviewList({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-800/70 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item, index) => (
          <p key={index} className="text-sm leading-relaxed text-slate-300">{item}</p>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

function SpeechStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-800/70 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function formatOptionalMetric(value: number | null, suffix: string): string {
  return value === null ? 'not captured' : `${value}${suffix}`;
}

function getMetricTone(value: number): string {
  if (value >= 8) return 'Strong';
  if (value >= 6) return 'Mixed';
  return 'Needs Work';
}

function isReportErrorResponse(value: unknown): value is ReportErrorResponse {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function normalizeMetrics(value: FinalReport['metrics']) {
  return {
    clarity: toSafeNumber(value?.clarity),
    depth: toSafeNumber(value?.depth),
    relevance: toSafeNumber(value?.relevance),
    structure: toSafeNumber(value?.structure),
    confidence: toSafeNumber(value?.confidence),
  };
}

function normalizeBehavioral(value: FinalReport['behavioral']) {
  return {
    leadership: toSafeNumber(value?.leadership),
    ownership: toSafeNumber(value?.ownership),
    problem_solving: toSafeNumber(value?.problem_solving),
    communication: toSafeNumber(value?.communication),
  };
}

function normalizeSpeech(value: FinalReport['speech']) {
  return {
    latency: toNullableNumber(value?.latency),
    speechRate: toNullableNumber(value?.speechRate),
    confidenceSignal: typeof value?.confidenceSignal === 'string' ? value.confidenceSignal : 'unknown',
    fillerWordCount: toSafeNumber(value?.fillerWordCount),
  };
}

function normalizeEvidenceSummary(value: FinalReport['evidence_summary']) {
  return {
    technical: Array.isArray(value?.technical) ? value.technical.filter(Boolean) : [],
    speaking: Array.isArray(value?.speaking) ? value.speaking.filter(Boolean) : [],
  };
}

function isRecommendationItem(value: unknown): value is RecommendationItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RecommendationItem>;
  return typeof item.title === 'string' && typeof item.reason === 'string' && typeof item.action === 'string';
}

function isQuestionReview(value: unknown): value is QuestionReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<QuestionReview>;
  return typeof review.phase === 'string' && typeof review.question === 'string';
}

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
