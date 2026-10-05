'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

interface InterviewSummaryItem {
  sessionId: string;
  domain: string;
  experienceLevel: string;
  createdAt: string;
  questionCount: number;
  completedPhases: string[];
  overallScore: number | null;
  hasEvaluations: boolean;
  hasResume: boolean;
}

interface HistoryResponse {
  interviews: InterviewSummaryItem[];
  summary: {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number | null;
    bestScore: number | null;
    latestRole: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/history');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to load interview history (status ${res.status})`);
      }
      const historyData = await res.json();
      setData(historyData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchHistory();
      }
    }
  }, [user, authLoading, router, fetchHistory]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || (loading && !data)) {
    return (
      <main className="min-h-screen bg-[#f4f8fb] text-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#72abad] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading your interview dashboard...</p>
        </div>
      </main>
    );
  }

  const interviews = data?.interviews || [];
  const summary = data?.summary || {
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: null,
    bestScore: null,
    latestRole: null,
  };

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800 font-sans relative flex flex-col justify-between">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#cdebe7]/40 via-[#f4f8fb] to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#72abad]/10 blur-[120px] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-4 max-w-7xl mx-auto w-full border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.3)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-[#4a8394] transition-colors">Intervue</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
            Signed in as <strong className="text-slate-800">{user?.name}</strong>
          </span>
          <button
            onClick={() => router.push('/setup')}
            className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_4px_12px_rgba(74,131,148,0.3)] transition-all active:scale-[0.97] duration-200"
          >
            + New Interview
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 py-10 flex-1 w-full">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse" />
              Candidate Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {user?.name || 'Candidate'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review your past mock interviews, track performance trends, and start new practice sessions.
            </p>
          </div>

          <button
            onClick={() => router.push('/setup')}
            className="self-start md:self-auto group px-6 py-3 rounded-2xl text-sm font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_6px_20px_rgba(74,131,148,0.35)] hover:shadow-[0_8px_25px_rgba(74,131,148,0.45)] transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 flex items-center gap-2"
          >
            <span>Start Practice Interview</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sessions</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{summary.totalInterviews}</p>
            <p className="text-[11px] text-slate-400 mt-1">{summary.completedInterviews} completed with report</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
            <p className="text-3xl font-black text-slate-900 mt-2">
              {summary.averageScore !== null ? `${summary.averageScore}/100` : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Across all completed interviews</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Score</p>
            <p className="text-3xl font-black text-[#4a8394] mt-2">
              {summary.bestScore !== null ? `${summary.bestScore}/100` : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Personal best evaluation</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Role</p>
            <p className="text-xl font-bold text-slate-900 mt-2 truncate">
              {summary.latestRole || 'None yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Most recent practice target</p>
          </div>
        </div>

        {/* Interview History Section */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Interview History</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any interview session to inspect its comprehensive evaluation report.</p>
            </div>
            {interviews.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {interviews.length} {interviews.length === 1 ? 'Interview' : 'Interviews'}
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-6">
              {error}
            </div>
          )}

          {interviews.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-[#cdebe7]/50 border border-[#72abad]/30 flex items-center justify-center mx-auto mb-4 text-[#4a8394]">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">No interviews completed yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                Start your first voice-based mock interview to build your performance profile and track your improvement.
              </p>
              <button
                onClick={() => router.push('/setup')}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_4px_12px_rgba(74,131,148,0.3)] transition-all active:scale-[0.97]"
              >
                Start First Interview →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Role & Level</th>
                    <th className="pb-3">Questions</th>
                    <th className="pb-3">Resume</th>
                    <th className="pb-3">Overall Score</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interviews.map((item) => {
                    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={item.sessionId}
                        onClick={() => router.push(`/analytics?sessionId=${item.sessionId}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 pl-2 font-medium text-slate-700 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-4">
                          <p className="font-bold text-slate-900 group-hover:text-[#4a8394] transition-colors">{item.domain}</p>
                          <p className="text-xs text-slate-400">{item.experienceLevel}</p>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {item.questionCount} {item.questionCount === 1 ? 'answer' : 'answers'}
                          </span>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          {item.hasResume ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Attached
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          {item.overallScore !== null && item.overallScore > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs bg-[#cdebe7]/50 text-[#2a5f6e] border border-[#72abad]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394]" />
                              {item.overallScore}/100
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">In progress / No score</span>
                          )}
                        </td>
                        <td className="py-4 pr-2 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4a8394] group-hover:text-[#3d6c7a] group-hover:translate-x-0.5 transition-all">
                            View Report →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-6 px-8 text-center text-xs text-slate-400">
        © 2025 Intervue. User Account & Longitudinal Performance System.
      </footer>
    </main>
  );
}
