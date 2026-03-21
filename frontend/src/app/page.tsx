'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Home() {
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

  const startSession = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Start Session
      const startRes = await fetch(`${BACKEND_URL}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, experienceLevel })
      });
      const sessionData = await startRes.json();
      
      if (!startRes.ok) throw new Error(sessionData.error || 'Failed to start session');

      const sessionId = sessionData.sessionId;

      // 2. Upload Resume if exists
      if (file) {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('sessionId', sessionId);

        const uploadRes = await fetch(`${BACKEND_URL}/api/upload-resume`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload resume');
      }

      // 3. Navigate
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('firstQuestion', sessionData.question);
      localStorage.setItem('currentPhase', sessionData.phase);
      
      router.push('/interview');

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during setup. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-900/20 via-[#0B0E14] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-0"></div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(47,217,244,0.4)]">
            <svg className="w-5 h-5 text-[#0B0E14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-manrope">Intervue</span>
        </div>

      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-4 md:py-1 grid grid-cols-1 lg:grid-cols-2  lg:gap-8 items-center">
        
        {/* Left Column: Hero Copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 uppercase tracking-widest backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Gemini-Powered Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] font-manrope">
            Nail your next <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">technical interview.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-lg leading-relaxed mix-blend-lighten">
            Experience ultra-realistic voice interviews with real-time coaching, behavioral analytics, and strict technical evaluations tailored to your exact experience level.
          </p>

          {/* Social Proof / Stats */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/50">
             <div>
               <h4 className="text-3xl font-bold text-white">98%</h4>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Hire Rate</p>
             </div>
             <div>
               <h4 className="text-3xl font-bold text-white">&lt;2s</h4>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Voice Latency</p>
             </div>
             <div>
               <h4 className="text-3xl font-bold text-white">40+</h4>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Role Profiles</p>
             </div>
          </div>
        </div>

        {/* Right Column: Interactive Setup Card */}
        <div className="relative flex justify-center lg:justify-end">
          {/* Neon Glow behind card */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 blur-[80px] rounded-[3rem] z-0"></div>
          
          <div className="relative z-10 w-full max-w-md bg-[#13161F]/90 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white font-manrope">Configure Session</h2>
              <p className="text-sm text-slate-400 mt-1">Design your interview environment</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-5">
              
              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 group-focus-within:text-indigo-400 transition-colors">Target Role</label>
                <div className="relative">
                  <select 
                    value={domain} 
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-[#0B0E14] border border-slate-700 hover:border-slate-500 focus:border-indigo-500 rounded-xl text-white outline-none appearance-none transition-all shadow-inner"
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 group-focus-within:text-indigo-400 transition-colors">Experience Level</label>
                <div className="relative">
                  <select 
                    value={experienceLevel} 
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-[#0B0E14] border border-slate-700 hover:border-slate-500 focus:border-indigo-500 rounded-xl text-white outline-none appearance-none transition-all shadow-inner"
                  >
                    <option value="Fresher">Fresher (New Grad)</option>
                    <option value="1-2 years">Junior (1-2 years)</option>
                    <option value="3-5 years">Mid-Level (3-5 years)</option>
                    <option value="5+ years">Senior (5+ years)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 transition-colors flex justify-between">
                  Candidate Resume
                  <span className="text-slate-600 text-[10px] lowercase normal-case">Optional</span>
                </label>
                <div className={`relative border border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${file ? 'border-cyan-400 bg-cyan-400/5' : 'border-slate-700 bg-[#0B0E14]/50 hover:border-slate-500'}`}>
                  <input 
                    type="file" 
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className={`w-8 h-8 transition-colors ${file ? 'text-cyan-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {file ? (
                      <span className="text-sm text-cyan-400 font-medium truncate max-w-[200px]">{file.name}</span>
                    ) : (
                      <span className="text-sm text-slate-400 font-medium">Upload PDF strictly</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={startSession}
                  disabled={loading}
                  className="w-full relative overflow-hidden group py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                  <div className="flex justify-center items-center gap-2 relative z-10">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Initializing Engine...
                      </>
                    ) : (
                      <>
                        Launch Interview Session
                        <svg className="w-5 h-5 ml-1 text-indigo-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </>
                    )}
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

    </main>
  );
}
