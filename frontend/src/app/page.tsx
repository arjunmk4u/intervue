'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800 font-sans overflow-x-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-[#cdebe7]/60 via-[#f4f8fb] to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#72abad]/15 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#cdebe7]/50 blur-[120px] pointer-events-none z-0" />

      {/* ——— NAVBAR ——— */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Intervue</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
          <button
            onClick={() => router.push('/setup')}
            className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_4px_14px_0_rgba(74,131,148,0.35)] hover:shadow-[0_6px_20px_rgba(74,131,148,0.3)] transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out"
          >
            Start Interview →
          </button>
        </div>
      </nav>

      {/* ——— HERO ——— */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse" />
          Voice-First Interview Intelligence
        </div>

        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-6">
          Nail your next<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a8394] to-[#72abad]">
            technical interview.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Practice with an AI interviewer that asks real questions, evaluates your answers, and gives you the coaching you need to get hired.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/setup')}
            className="group px-8 py-4 rounded-2xl text-base font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_8px_30px_rgba(74,131,148,0.4)] hover:shadow-[0_12px_40px_rgba(74,131,148,0.5)] transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out flex items-center gap-2"
          >
            Start Free Interview
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
          <a href="#how-it-works" className="px-8 py-4 rounded-2xl text-base font-bold text-slate-700 bg-white border border-slate-200 hover:border-[#72abad] hover:bg-[#f4f8fb] transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out">
            See how it works
          </a>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-6 max-w-lg mx-auto pt-8 border-t border-slate-200">
          <div>
            <p className="text-4xl font-extrabold text-slate-900">98%</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">Hire Rate</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-slate-900">&lt;2s</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">Voice Latency</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-slate-900">40+</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">Role Profiles</p>
          </div>
        </div>
      </section>

      {/* ——— FEATURES ——— */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-3">Why Intervue</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Built for real interview prep</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#72abad]/40 hover:-translate-y-1 transition-all duration-300 ease-emil-out group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#cdebe7] to-[#72abad] flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(114,171,173,0.3)] group-hover:scale-110 transition-transform duration-300 ease-emil-out">
              <svg className="w-6 h-6 text-[#2a5f6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Voice-First Experience</h3>
            <p className="text-slate-500 leading-relaxed">Speak your answers naturally — just like a real interview. No typing, no pressure. The AI interviewer listens and responds in real-time.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#72abad]/40 hover:-translate-y-1 transition-all duration-300 ease-emil-out group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#cdebe7] to-[#72abad] flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(114,171,173,0.3)] group-hover:scale-110 transition-transform duration-300 ease-emil-out">
              <svg className="w-6 h-6 text-[#2a5f6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Real-Time AI Coaching</h3>
            <p className="text-slate-500 leading-relaxed">Get instant behavioral and technical feedback on every answer. The AI evaluates your clarity, depth, structure, and confidence — just like a hiring manager.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#72abad]/40 hover:-translate-y-1 transition-all duration-300 ease-emil-out group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#cdebe7] to-[#72abad] flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(114,171,173,0.3)] group-hover:scale-110 transition-transform duration-300 ease-emil-out">
              <svg className="w-6 h-6 text-[#2a5f6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Analytics Report</h3>
            <p className="text-slate-500 leading-relaxed">After every session, receive a detailed report: question-by-question breakdowns, speaking metrics, strengths, weaknesses, and personalized recommendations.</p>
          </div>
        </div>
      </section>

      {/* ——— HOW IT WORKS ——— */}
      <section id="how-it-works" className="relative z-10 py-24 bg-gradient-to-b from-transparent via-[#cdebe7]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-3">Simple & Fast</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Interview in 3 steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px border-t-2 border-dashed border-[#72abad]/30 z-0" />

            {[
              { step: '01', title: 'Configure Your Session', desc: 'Choose your target role, experience level, and optionally upload your resume for personalized questions.', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
              { step: '02', title: 'Do the Live Interview', desc: 'Speak your answers out loud. The AI interviewer asks questions phase by phase — intro, technical, behavioral, and more.', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
              { step: '03', title: 'Review Your Report', desc: 'Get a full analytics report with scoring, strengths, weaknesses, speaking analysis, and targeted recommendations.', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative z-10 flex flex-col items-center text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#72abad]/30 flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(114,171,173,0.15)]">
                  <svg className="w-7 h-7 text-[#4a8394]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <span className="text-xs font-black text-[#72abad] uppercase tracking-widest mb-2">{step}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— FINAL CTA ——— */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 shadow-[0_20px_60px_rgba(74,131,148,0.12)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4a8394] to-[#72abad]" />
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-5 tracking-tight">Ready to ace your<br />next interview?</h2>
          <p className="text-xl text-slate-500 mb-10 max-w-xl mx-auto">Join thousands of candidates who have sharpened their interview skills with Intervue. It&apos;s free to start.</p>
          <button
            onClick={() => router.push('/setup')}
            className="group px-10 py-4 rounded-2xl text-base font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_8px_30px_rgba(74,131,148,0.4)] hover:shadow-[0_12px_40px_rgba(74,131,148,0.5)] transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out inline-flex items-center gap-2"
          >
            Start Your Free Interview
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-10 border-t border-slate-200 py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="20" r="17" />
                <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
                <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(114,171,173,0.7)" />
                <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(114,171,173,0.7)" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-700">Intervue</span>
          </div>
          <p className="text-xs text-slate-400">© 2025 Intervue. AI-powered interview training.</p>
        </div>
      </footer>
    </main>
  );
}
