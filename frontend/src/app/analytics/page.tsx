'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface FinalReport {
  overall_score: number;
  percentile: number;
  metrics: { clarity: number; depth: number; relevance: number; structure: number; confidence: number };
  behavioral: { leadership: number; ownership: number; problem_solving: number; communication: number };
  speech: { latency: number; speechRate: number; confidenceSignal: string };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
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
        // Check if data is an error object
        if (data.error) {
          console.error('Report error detail:', data.error);
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

  if (loading) {
    return <AnalyticsLoadingState />;
  }

  if (!report || (report as any).error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0E14] px-6 text-center text-slate-200">
        <h2 className="text-2xl font-bold text-white">Analysis Unavailable</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Could not retrieve the report. The session may be invalid or incomplete.
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

  const safePercentile = Number.isNaN(report.percentile) ? 0 : report.percentile;
  const scoreTone = report.overall_score >= 80 ? 'Elite' : report.overall_score >= 65 ? 'Strong' : 'Developing';
  const paceTone =
    report.speech?.speechRate >= 120 && report.speech?.speechRate <= 160 ? 'Optimal Pace' : 'Adjust Pace';
  const latencyTone = report.speech?.latency <= 2.5 ? 'Sharp Recall' : 'Needs Faster Starts';

  return (
    <main className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[420px] bg-gradient-to-b from-indigo-900/20 via-[#0B0E14] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-15%] left-[-8%] h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[18%] right-[-12%] h-[520px] w-[520px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-6 md:px-12 md:py-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 px-6 py-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              Performance Intelligence
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              Technical assessment overview
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
              A cinematic readout of your interview performance, speech rhythm, and growth path.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-700/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-white/5 hover:text-white"
            >
              New Session
            </Link>
            <button className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0B0E14] transition hover:bg-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              Share Report
            </button>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Global Percentile" value={safePercentile} suffix="th" tone="Top Tier" toneClass="emerald" />
          <StatCard
            label="Raw Score"
            value={report.overall_score || 0}
            suffix="/ 100"
            tone={scoreTone}
            accent
            toneClass="indigo"
          />
          <StatCard
            label="Speaking Rate"
            value={report.speech?.speechRate || 0}
            suffix="wpm"
            tone={paceTone}
            toneClass="cyan"
          />
          <StatCard
            label="Response Latency"
            value={report.speech?.latency || 0}
            suffix="s"
            tone={latencyTone}
            toneClass="amber"
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/70 bg-[#13161F]/90 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">Core Signals</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Interview quality matrix</h2>
                </div>
                <div className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Confidence {report.speech?.confidenceSignal || 'unknown'}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(report.metrics || {}).map(([key, value]) => (
                  <div key={key} className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold capitalize text-slate-300">{key.replace('_', ' ')}</span>
                      <span className="text-lg font-bold text-white">{value}</span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                        style={{ width: `${Math.max(8, Math.min(100, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(report.behavioral || {}).map(([key, value]) => (
                  <div key={key} className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{key.replace('_', ' ')}</p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <span className="text-3xl font-bold text-white">{value}</span>
                      <span className="text-xs font-medium text-slate-500">behavioral score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <InsightCard
                title="What landed well"
                label="Strengths"
                emptyMessage="Not enough data to determine strengths."
                tone="emerald"
                items={report.strengths}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <InsightCard
                title="What to sharpen next"
                label="Growth Areas"
                emptyMessage="No significant weaknesses identified."
                tone="rose"
                items={report.weaknesses}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/70 bg-[#13161F]/90 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Coach Feed</p>
              <h2 className="mt-2 text-xl font-bold text-white">Action plan</h2>
              <div className="mt-6 space-y-4">
                {report.suggestions?.length > 0 ? report.suggestions.map((sug, i) => (
                  <div key={i} className="rounded-[1.4rem] border border-slate-800/80 bg-slate-950/70 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Step 0{i + 1}</span>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{sug}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No suggestions available.</p>}
              </div>
              <button className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                Start Focus Practice
              </button>
            </div>

            <div className="rounded-[2rem] border border-slate-800/70 bg-[#13161F]/90 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Speech Pulse</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-4xl font-extrabold text-white">{report.speech?.confidenceSignal || 'n/a'}</span>
                <span className="pb-1 text-sm text-slate-500">signal</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-[1.25rem] border border-slate-800/70 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Latency</p>
                  <p className="mt-2 text-2xl font-bold text-white">{report.speech?.latency || 0}s</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-800/70 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Rate</p>
                  <p className="mt-2 text-2xl font-bold text-white">{report.speech?.speechRate || 0} wpm</p>
                </div>
              </div>
            </div>
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

function InsightCard({
  title,
  label,
  emptyMessage,
  tone,
  items,
  icon,
}: {
  title: string;
  label: string;
  emptyMessage: string;
  tone: 'emerald' | 'rose';
  items: string[];
  icon: React.ReactNode;
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${toneStyles.badge}`}>{icon}</div>
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
