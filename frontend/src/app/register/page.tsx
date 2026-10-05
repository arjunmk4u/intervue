'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await register(name, email, password);
    if (!res.success) {
      setError(res.error || 'Registration failed. Please try again.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-800 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#cdebe7]/50 via-[#f4f8fb] to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#72abad]/15 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#cdebe7]/40 blur-[120px] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-[#4a8394] transition-colors">Intervue</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to home
        </Link>
      </nav>

      {/* Register Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-xs font-bold text-[#4a8394] uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse" />
              Create Free Account
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Get started with Intervue</h1>
            <p className="text-sm text-slate-500 mt-2">Track your interview progress, compare scores over time, and master your technical interviews.</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-[0_20px_50px_rgba(74,131,148,0.08)]">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#72abad] focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#72abad] focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="password">
                  Password (min 6 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#72abad] focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#72abad] focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl font-bold text-white text-sm bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_4px_14px_rgba(74,131,148,0.35)] transition-all active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account →</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-[#4a8394] hover:text-[#3d6c7a] underline transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400">
        © 2025 Intervue. AI-powered interview training.
      </footer>
    </main>
  );
}
