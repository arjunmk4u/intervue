'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function SetupPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => setFile(null);

  const startSession = async () => {
    setLoading(true);
    setError('');

    try {
      const startRes = await fetch(`${BACKEND_URL}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, experienceLevel }),
      });
      const sessionData = await startRes.json();
      if (!startRes.ok) throw new Error(sessionData.error || 'Failed to start session');

      const sessionId = sessionData.sessionId;

      if (file) {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('sessionId', sessionId);
        const uploadRes = await fetch(`${BACKEND_URL}/api/upload-resume`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload resume');
      }

      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('firstQuestion', sessionData.question);
      localStorage.setItem('currentPhase', sessionData.phase);
      router.push('/interview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen bg-[#f4f8fb] text-slate-800 font-sans relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#cdebe7]/50 via-[#f4f8fb] to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#72abad]/15 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#cdebe7]/40 blur-[120px] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-4 max-w-7xl mx-auto w-full shrink-0">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-[#4a8394] transition-colors">Intervue</span>
        </button>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to home
        </button>
      </nav>

      {/* Setup Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse" />
              Interview Setup
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Configure Your Session</h1>
            <p className="text-sm text-slate-500">Set up your personalised interview environment in seconds.</p>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-7 shadow-[0_20px_60px_rgba(74,131,148,0.12)]">

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-4">

              {/* Target Role */}
              <div className="group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-[#4a8394] transition-colors">
                  Target Role
                </label>
                <div className="relative">
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-[#f4f8fb] border border-slate-200 hover:border-[#72abad] focus:border-[#4a8394] rounded-xl text-slate-800 outline-none appearance-none transition-all"
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                    <option value="DevOps Engineer">DevOps Engineer</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Experience Level */}
              <div className="group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-[#4a8394] transition-colors">
                  Experience Level
                </label>
                <div className="relative">
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-[#f4f8fb] border border-slate-200 hover:border-[#72abad] focus:border-[#4a8394] rounded-xl text-slate-800 outline-none appearance-none transition-all"
                  >
                    <option value="Fresher">Fresher (New Grad)</option>
                    <option value="1-2 years">Junior (1-2 years)</option>
                    <option value="3-5 years">Mid-Level (3-5 years)</option>
                    <option value="5+ years">Senior (5+ years)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resume</label>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
                </div>

                {file ? (
                  <div className="flex items-center gap-3 p-4 bg-[#cdebe7]/30 border border-[#72abad]/40 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-[#4a8394]/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-[#4a8394]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#4a8394] truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 hover:border-[#72abad] bg-slate-50 hover:bg-[#cdebe7]/10 rounded-xl cursor-pointer transition-all duration-200 group">
                    <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-[#72abad] flex items-center justify-center transition-colors shadow-sm shrink-0">
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-[#4a8394] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">Drop your resume here</p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF or DOCX, max 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  onClick={startSession}
                  disabled={loading}
                  className="w-full relative overflow-hidden group py-4 rounded-xl font-bold text-white bg-[#4a8394] hover:bg-[#3d6c7a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_0_rgba(74,131,148,0.39)] hover:shadow-[0_6px_20px_rgba(74,131,148,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  <div className="flex justify-center items-center gap-2 relative z-10">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Initializing Engine...
                      </>
                    ) : (
                      <>
                        Launch Interview Session
                        <svg className="w-5 h-5 text-[#cdebe7] group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>
                <p className="text-center text-xs text-slate-400 mt-4">Your session is private and not shared with anyone.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
