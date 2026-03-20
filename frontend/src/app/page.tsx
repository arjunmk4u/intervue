'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Home() {
  const router = useRouter();
  const [domain, setDomain] = useState('Software Engineer');
  const [difficulty, setDifficulty] = useState('medium');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startSession = async () => {
    if (!file) {
      setError('Please upload a resume (PDF/DOCX) first.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // 1. Start Session
      const startRes = await fetch(`${BACKEND_URL}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, difficulty })
      });
      const sessionData = await startRes.json();
      
      if (!startRes.ok) throw new Error(sessionData.error || 'Failed to start session');

      const sessionId = sessionData.sessionId;

      // 2. Upload Resume
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('sessionId', sessionId);

      const uploadRes = await fetch(`${BACKEND_URL}/api/upload-resume`, {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload resume');

      // 3. Navigate to Interview Room
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('firstQuestion', sessionData.question);
      localStorage.setItem('currentPhase', sessionData.phase);
      if (sessionData.avatar?.enabled) {
        localStorage.setItem('avatarEnabled', 'true');
      } else {
        localStorage.removeItem('avatarEnabled');
      }
      
      router.push('/interview');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during setup. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-200 font-sans">
      <div className="w-full max-w-xl p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent text-center">
            AI Interview Simulator
          </h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-medium">Configure your session to begin</p>
        </div>
        
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-sm font-medium animate-pulse">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 ml-1">Target Role Domain</label>
            <select 
              value={domain} 
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Product Manager">Product Manager</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 ml-1">Interview Difficulty</label>
            <div className="flex gap-3">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-3.5 rounded-2xl capitalize font-semibold transition-all duration-300 ${
                    difficulty === level 
                      ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-500' 
                      : 'bg-slate-950/30 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 ml-1">Candidate Resume (PDF)</label>
            <div className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 group cursor-pointer ${file ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 bg-slate-950/30 hover:border-indigo-400 hover:bg-slate-900/50'}`}>
              <input 
                type="file" 
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-3">
                <svg className={`w-10 h-10 transition-colors ${file ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="transition-colors">
                  {file ? (
                    <span className="text-indigo-300 font-medium">{file.name}</span>
                  ) : (
                    <span className="text-slate-400 font-medium group-hover:text-slate-300">Drag and drop or click to browse</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={startSession}
            disabled={loading}
            className="w-full mt-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:ring-4 focus:ring-indigo-500/30 shadow-lg shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up environment...
              </>
            ) : (
              'Initialize Interview Session'
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
