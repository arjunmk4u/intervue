'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

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

interface ComparisonData {
  hasPrevious: boolean;
  message?: string;
  current?: {
    sessionId: string;
    domain: string;
    experienceLevel: string;
    createdAt: string;
    overall_score: number;
    metrics?: Record<string, number>;
    behavioral?: Record<string, number>;
    speech?: Record<string, unknown>;
  };
  previous?: {
    sessionId: string;
    domain: string;
    experienceLevel: string;
    createdAt: string;
    overall_score: number;
    metrics?: Record<string, number>;
    behavioral?: Record<string, number>;
    speech?: Record<string, unknown>;
  };
  delta?: {
    overall_score: number;
    technical: number;
    behavioral: number;
    speech: number | null;
  };
}

interface ReportErrorResponse {
  error: string;
}

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
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<FinalReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    let sessionId = searchParams?.get('sessionId');
    if (!sessionId) {
      sessionId = localStorage.getItem('sessionId');
    }

    if (!sessionId) {
      router.push('/dashboard');
      return;
    }

    const fetchReportAndComparison = async () => {
      try {
        const [reportRes, compRes] = await Promise.all([
          apiFetch(`/api/final-report?sessionId=${sessionId}`),
          apiFetch(`/api/history/comparison?sessionId=${sessionId}`).catch(() => null),
        ]);

        if (reportRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!reportRes.ok) {
          throw new Error(`API returned ${reportRes.status}`);
        }

        const reportData = await reportRes.json();
        if (isReportErrorResponse(reportData)) {
          setReport(null);
        } else {
          setReport(reportData);
        }

        if (compRes && compRes.ok) {
          const compData = await compRes.json();
          setComparison(compData);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReportAndComparison();
    }
  }, [router, searchParams, user, authLoading]);

  if (authLoading || loading) return <AnalyticsLoadingState />;

  if (!report || !Number.isFinite(report.interview_count) || report.interview_count === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f8fb] px-6 text-center text-slate-800">
        <h2 className="text-2xl font-bold text-slate-900">Assessment Unavailable</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          This report only appears after at least one analyzed interview answer has been saved.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-white border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/setup"
            className="rounded-full bg-[#4a8394] px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out hover:bg-[#3d6c7a] shadow-[0_4px_14px_0_rgba(74,131,148,0.35)]"
          >
            Start Interview
          </Link>
        </div>
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
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800 font-sans selection:bg-[#72abad]/30 overflow-x-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-[#cdebe7]/60 via-[#f4f8fb] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#72abad]/15 blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#cdebe7]/50 blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-6 md:px-12 md:py-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4a8394] hover:text-[#3d6c7a] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/setup"
              className="rounded-full bg-[#4a8394] px-4 py-2 text-xs font-bold text-white hover:bg-[#3d6c7a] transition-all shadow-[0_4px_12px_rgba(74,131,148,0.3)]"
            >
              + Practice Again
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="rounded-[2rem] border border-slate-200 bg-white/75 px-6 py-5 shadow-[0_20px_60px_rgba(74,131,148,0.08)] backdrop-blur-xl transition-all duration-300 ease-emil-out hover:shadow-[0_20px_60px_rgba(74,131,148,0.12)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#4a8394]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4a8394] animate-pulse"></span>
                Evidence-Based Report
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                Interview performance evaluation
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500 md:text-base">
                Every score and recommendation below is derived from your spoken interview answers saved in this session.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out hover:bg-slate-50 hover:border-slate-400 shadow-sm"
              >
                All Interviews
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryChip label="Answers Analyzed" value={String(report.interview_count)} />
            <SummaryChip label="Phases Covered" value={completedPhases.join(', ') || 'none'} />
            <SummaryChip label="Overall Score" value={`${report.overall_score}/100`} />
          </div>
        </header>

        {/* Longitudinal Comparison Section */}
        {comparison && (
          <section className="mt-8 rounded-[2rem] border border-slate-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#cdebe7] text-[#4a8394] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h2 className="text-base font-bold text-slate-900">Longitudinal Performance Tracking</h2>
            </div>

            {comparison.hasPrevious && comparison.previous && comparison.delta ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#cdebe7]/30 to-[#f4f8fb] border border-[#72abad]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Compared against previous interview on{' '}
                      <strong className="text-slate-800">
                        {new Date(comparison.previous.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>{' '}
                      ({comparison.previous.domain})
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      Current Score: {comparison.current?.overall_score || report.overall_score}/100 • Previous: {comparison.previous.overall_score}/100
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold uppercase text-slate-400">Score Delta:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      comparison.delta.overall_score > 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : comparison.delta.overall_score < 0
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {comparison.delta.overall_score > 0 ? `+${comparison.delta.overall_score} pts` : `${comparison.delta.overall_score} pts`}
                    </span>
                  </div>
                </div>

                {/* Sub-Metrics Delta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Technical Trajectory</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-bold text-slate-800">Technical Avg</span>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        comparison.delta.technical > 0 ? 'text-emerald-700 bg-emerald-50' : comparison.delta.technical < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100'
                      }`}>
                        {comparison.delta.technical > 0 ? `+${comparison.delta.technical}` : `${comparison.delta.technical}`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Behavioral Trajectory</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-bold text-slate-800">Behavioral Avg</span>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        comparison.delta.behavioral > 0 ? 'text-emerald-700 bg-emerald-50' : comparison.delta.behavioral < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100'
                      }`}>
                        {comparison.delta.behavioral > 0 ? `+${comparison.delta.behavioral}` : `${comparison.delta.behavioral}`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Speech & Delivery</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-bold text-slate-800">Speech Heuristic</span>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        comparison.delta.speech !== null && comparison.delta.speech > 0
                          ? 'text-emerald-700 bg-emerald-50'
                          : comparison.delta.speech !== null && comparison.delta.speech < 0
                          ? 'text-rose-700 bg-rose-50'
                          : 'text-slate-600 bg-slate-100'
                      }`}>
                        {comparison.delta.speech !== null ? (comparison.delta.speech > 0 ? `+${comparison.delta.speech}` : `${comparison.delta.speech}`) : 'Baseline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#cdebe7] text-[#4a8394] flex items-center justify-center shrink-0">
                  🌱
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">First Mock Interview</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This is your first completed interview. Complete another practice session to track your longitudinal score deltas and progress over time.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Top 4 Metric Highlights */}
        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Clarity" value={metrics.clarity} suffix="/ 10" tone={getMetricTone(metrics.clarity)} toneClass="indigo" accent />
          <StatCard label="Depth" value={metrics.depth} suffix="/ 10" tone={getMetricTone(metrics.depth)} toneClass="emerald" />
          <StatCard label="Relevance" value={metrics.relevance} suffix="/ 10" tone={getMetricTone(metrics.relevance)} toneClass="cyan" />
          <StatCard label="Problem Solving" value={behavioral.problem_solving} suffix="/ 10" tone={getMetricTone(behavioral.problem_solving)} toneClass="amber" />
        </section>

        {/* Main 2-Column Grid */}
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
                    <div key={`${review.phase}-${index}`} className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 ease-emil-out">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            {review.phase}
                          </div>
                          <h3 className="mt-3 text-base font-bold text-slate-900">{review.question}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-right text-sm font-medium text-slate-500">
                          <span>clarity {review.scores.clarity}</span>
                          <span>depth {review.scores.depth}</span>
                          <span>relevance {review.scores.relevance}</span>
                          <span>confidence {review.scores.confidence}</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Your Answer</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.answerPreview}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ReviewList title="Worked well" items={review.strengths} emptyMessage="No positive evidence stored for this answer." />
                        <ReviewList title="Needs work" items={review.weaknesses} emptyMessage="No weaknesses stored for this answer." />
                      </div>

                      <div className="mt-4 rounded-[1.25rem] border border-sky-100 bg-sky-50/70 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">Coaching Tip</p>
                        <p className="mt-2 text-sm leading-relaxed text-sky-900">{review.tip}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No question reviews recorded yet.</p>
                  )}
                </div>
              }
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Panel
              eyebrow="Targeted Coaching"
              title="Next actions to improve"
              body={
                <div className="space-y-4">
                  {recommendations.length > 0 ? recommendations.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md duration-300 ease-emil-out">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          item.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.priority} priority
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.reason}</p>
                      <div className="mt-4 rounded-[1.25rem] bg-slate-50 p-4 border border-slate-100">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Action</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{item.action}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No specific action items needed based on the current scoring.</p>
                  )}
                </div>
              }
            />

            <Panel
              eyebrow="Behavioral Signals"
              title="Workplace heuristics"
              body={
                <div className="space-y-3">
                  {Object.entries(behavioral).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
                      <span className="text-sm font-semibold capitalize text-slate-700">{key.replace('_', ' ')}</span>
                      <span className="text-base font-bold text-slate-900">{value} / 10</span>
                    </div>
                  ))}
                </div>
              }
            />

            <Panel
              eyebrow="Speech & Pace"
              title="Delivery heuristics"
              body={
                <div className="grid grid-cols-2 gap-3">
                  <SpeechStat label="Answer Latency" value={formatOptionalMetric(speech.latency, 's')} />
                  <SpeechStat label="Speaking Pace" value={formatOptionalMetric(speech.speechRate, ' wpm')} />
                  <SpeechStat label="Filler Words" value={String(speech.fillerWordCount)} />
                  <SpeechStat label="Confidence Signal" value={speech.confidenceSignal} />
                </div>
              }
            />

            <Panel
              eyebrow="Evidence Summaries"
              title="Signals logged"
              body={
                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Technical Highlights</p>
                    <div className="mt-3 space-y-2">
                      {evidenceSummary.technical.length > 0 ? evidenceSummary.technical.map((item, index) => (
                        <p key={index} className="text-xs leading-relaxed text-slate-600">• {item}</p>
                      )) : <p className="text-xs text-slate-400">No explicit technical highlights were summarized.</p>}
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Speaking Highlights</p>
                    <div className="mt-3 space-y-2">
                      {evidenceSummary.speaking.length > 0 ? evidenceSummary.speaking.map((item, index) => (
                        <p key={index} className="text-xs leading-relaxed text-slate-600">• {item}</p>
                      )) : <p className="text-xs text-slate-400">No explicit speaking highlights were summarized.</p>}
                    </div>
                  </div>
                </div>
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function AnalyticsLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f8fb] text-slate-800">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#72abad] border-t-transparent mx-auto"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-600">Loading interview report...</p>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
  toneClass,
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: string;
  toneClass: 'indigo' | 'emerald' | 'cyan' | 'amber';
  accent?: boolean;
}) {
  const toneBg = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[toneClass];

  return (
    <div className={`rounded-[2rem] border p-6 transition-all duration-300 ease-emil-out hover:-translate-y-1 hover:shadow-md ${
      accent ? 'border-[#72abad]/40 bg-white/95 shadow-[0_10px_30px_rgba(114,171,173,0.1)]' : 'border-slate-200 bg-white/80 shadow-sm'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${toneBg}`}>{tone}</span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-900 md:text-4xl">
        {value} <span className="text-base font-semibold text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}

function Panel({ eyebrow, title, body }: { eyebrow: string; title: string; body: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 ease-emil-out hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4a8394]">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-extrabold text-slate-900">{title}</h3>
      <div className="mt-6">{body}</div>
    </section>
  );
}

function MetricMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md duration-300 ease-emil-out">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold capitalize text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-[#72abad] to-[#4a8394]" style={{ width: `${Math.max(8, Math.min(100, value * 10))}%` }} />
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
      badge: 'bg-emerald-100 text-emerald-600',
      label: 'text-emerald-600',
      card: 'border-emerald-100 bg-emerald-50',
    },
    rose: {
      badge: 'bg-rose-100 text-rose-600',
      label: 'text-rose-600',
      card: 'border-rose-100 bg-rose-50',
    },
  }[tone];

  return (
    <div className="group rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-emil-out backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${toneStyles.badge}`}></div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.25em] ${toneStyles.label}`}>{label}</p>
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {items?.length > 0 ? items.map((item, i) => (
          <div key={i} className={`rounded-[1.25rem] border p-4 text-sm leading-relaxed text-slate-700 ${toneStyles.card}`}>
            {item}
          </div>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

function ReviewList({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-emil-out">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item, index) => (
          <p key={index} className="text-sm leading-relaxed text-slate-700">{item}</p>
        )) : <p className="text-sm text-slate-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}

function SpeechStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:bg-slate-50 duration-300 ease-emil-out">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
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
    latency: typeof value?.latency === 'number' && Number.isFinite(value.latency) ? value.latency : null,
    speechRate: typeof value?.speechRate === 'number' && Number.isFinite(value.speechRate) ? value.speechRate : null,
    confidenceSignal: typeof value?.confidenceSignal === 'string' && value.confidenceSignal ? value.confidenceSignal : 'unknown',
    fillerWordCount: typeof value?.fillerWordCount === 'number' && Number.isFinite(value.fillerWordCount) ? value.fillerWordCount : 0,
  };
}

function normalizeEvidenceSummary(value: FinalReport['evidence_summary']) {
  return {
    technical: Array.isArray(value?.technical) ? value.technical.filter(Boolean) : [],
    speaking: Array.isArray(value?.speaking) ? value.speaking.filter(Boolean) : [],
  };
}

function isRecommendationItem(value: unknown): value is RecommendationItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<RecommendationItem>;
  return typeof v.title === 'string' && typeof v.reason === 'string' && typeof v.action === 'string' && (v.priority === 'high' || v.priority === 'medium');
}

function isQuestionReview(value: unknown): value is QuestionReview {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<QuestionReview>;
  return (
    typeof v.phase === 'string' &&
    typeof v.question === 'string' &&
    typeof v.answerPreview === 'string' &&
    typeof v.tip === 'string' &&
    typeof v.scores === 'object' &&
    v.scores !== null &&
    typeof v.behavioral === 'object' &&
    v.behavioral !== null &&
    typeof v.speech === 'object' &&
    v.speech !== null &&
    Array.isArray(v.strengths) &&
    Array.isArray(v.weaknesses)
  );
}

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
