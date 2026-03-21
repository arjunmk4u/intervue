'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

interface TtsFallbackResponse {
  error?: string;
  fallback?: boolean;
  reason?: 'quota_exhausted' | 'request_failed' | 'no_api_key' | 'no_audio';
  message?: string;
  retryAfterMs?: number;
  model?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function InterviewRoom() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [phase, setPhase] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioRef = useRef<{ audio: HTMLAudioElement; url: string; text: string } | null>(null);
  const pendingSpeechTextRef = useRef<string | null>(null);
  const interactionRetryHandlerRef = useRef<(() => void) | null>(null);
  const hasUserInteractedRef = useRef<boolean>(false);
  const geminiCooldownUntilRef = useRef<number>(0);
  const initialSpeakRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [pulseMetrics, setPulseMetrics] = useState<{ latency: number; speechRate: number; confidenceSignal: string } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const unregisterPlaybackRetry = () => {
    if (typeof window === 'undefined' || !interactionRetryHandlerRef.current) return;

    window.removeEventListener('pointerdown', interactionRetryHandlerRef.current);
    window.removeEventListener('keydown', interactionRetryHandlerRef.current);
    interactionRetryHandlerRef.current = null;
  };

  const clearPendingAudio = () => {
    if (!pendingAudioRef.current) return;

    pendingAudioRef.current.audio.pause();
    URL.revokeObjectURL(pendingAudioRef.current.url);
    pendingAudioRef.current = null;
  };

  const queueBrowserSpeechRetry = (text: string) => {
    if (typeof window === 'undefined') return;

    pendingSpeechTextRef.current = text;
    unregisterPlaybackRetry();

    const retrySpeech = () => {
      const pendingText = pendingSpeechTextRef.current;
      unregisterPlaybackRetry();
      pendingSpeechTextRef.current = null;

      if (!pendingText || !isMountedRef.current) return;
      hasUserInteractedRef.current = true;
      speakBrowserFallback(pendingText, false);
    };

    interactionRetryHandlerRef.current = retrySpeech;
    window.addEventListener('pointerdown', retrySpeech);
    window.addEventListener('keydown', retrySpeech);
  };

  const speakBrowserFallback = (text: string, allowDeferred = true) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (allowDeferred && !hasUserInteractedRef.current) {
      queueBrowserSpeechRetry(text);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onerror = (event) => {
      console.warn('[TTS] Browser fallback speech error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'interrupted') {
        queueBrowserSpeechRetry(text);
      }
    };

    const loadVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find((voice) =>
        voice.name.includes('Google UK English Female') ||
        voice.name.includes('Google US English') ||
        voice.name.includes('Microsoft Aria') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Female')
      );

      if (premiumVoice) utterance.voice = premiumVoice;

      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoicesAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoicesAndSpeak;
    }
  };

  const queueAudioRetry = (audio: HTMLAudioElement, url: string, text: string) => {
    if (typeof window === 'undefined') return;

    clearPendingAudio();
    unregisterPlaybackRetry();
    pendingAudioRef.current = { audio, url, text };

    const retryPlayback = () => {
      const pending = pendingAudioRef.current;
      unregisterPlaybackRetry();

      if (!pending || !isMountedRef.current) return;

      hasUserInteractedRef.current = true;
      pending.audio.play().then(() => {
        pendingAudioRef.current = null;
      }).catch((error) => {
        console.warn('[TTS] Retry playback failed, using browser fallback:', error);
        clearPendingAudio();
        speakBrowserFallback(pending.text, false);
      });
    };

    interactionRetryHandlerRef.current = retryPlayback;
    window.addEventListener('pointerdown', retryPlayback);
    window.addEventListener('keydown', retryPlayback);
  };

  useEffect(() => {
    const markInteraction = () => {
      hasUserInteractedRef.current = true;
    };

    window.addEventListener('pointerdown', markInteraction);
    window.addEventListener('keydown', markInteraction);

    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem('sessionId');
    const firstQuestion = localStorage.getItem('firstQuestion');
    const storedPhase = localStorage.getItem('currentPhase');

    if (!storedSession) {
      router.push('/');
      return;
    }

    setSessionId(storedSession);
    if (storedPhase) setPhase(storedPhase);

    if (firstQuestion && !initialSpeakRef.current) {
      initialSpeakRef.current = true;
      setMessages([{ role: 'assistant', content: firstQuestion }]);
      void speakResponse(firstQuestion);
    }

    return () => {
      isMountedRef.current = false;
      unregisterPlaybackRetry();
      clearPendingAudio();
      pendingSpeechTextRef.current = null;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakResponse = async (text: string): Promise<void> => {
    if (!isMountedRef.current) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    unregisterPlaybackRetry();
    clearPendingAudio();
    pendingSpeechTextRef.current = null;

    if (Date.now() < geminiCooldownUntilRef.current) {
      speakBrowserFallback(text);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        let fallbackData: TtsFallbackResponse | null = null;

        try {
          fallbackData = (await res.json()) as TtsFallbackResponse;
        } catch {
          fallbackData = null;
        }

        if (fallbackData?.reason === 'quota_exhausted') {
          const retryAfterMs = Math.max(15000, fallbackData.retryAfterMs || 60000);
          geminiCooldownUntilRef.current = Date.now() + retryAfterMs;
          setVoiceNotice(`Gemini voice quota is exhausted right now. Using browser voice for about ${Math.ceil(retryAfterMs / 1000)}s.`);
        } else if (fallbackData?.message) {
          setVoiceNotice(`Gemini voice unavailable. Using browser voice instead.`);
          console.warn('[TTS] Gemini fallback reason:', fallbackData.message);
        }

        if (isMountedRef.current) speakBrowserFallback(text);
        return;
      }

      setVoiceNotice(null);

      const blob = await res.blob();
      if (!isMountedRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      activeAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        if (pendingAudioRef.current?.audio === audio) {
          pendingAudioRef.current = null;
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        if (pendingAudioRef.current?.audio === audio) {
          pendingAudioRef.current = null;
        }
      };

      try {
        await audio.play();
      } catch (playError: unknown) {
        if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
          console.warn('[TTS] Autoplay blocked, waiting for user interaction');
          queueAudioRetry(audio, url, text);
          return;
        }
        throw playError;
      }
    } catch (err: unknown) {
      if ((err instanceof DOMException && err.name === 'AbortError') || !isMountedRef.current) {
        return;
      }
      console.warn('[TTS] Gemini failed, using browser fallback:', err);
      setVoiceNotice('Gemini voice request failed. Using browser voice instead.');
      speakBrowserFallback(text);
    }
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsConverting(true);
        const audioBlob = new Blob(chunks, { type: recorder.mimeType });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'record.webm');

        try {
          const res = await fetch(`${BACKEND_URL}/api/transcribe`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            handleVoiceSubmit(data.transcript);
          } else {
            console.warn('Deepgram returned empty transcript');
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsConverting(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone! Please ensure permissions are granted.');
    }
  };

  const handleVoiceSubmit = async (transcript: string) => {
    if (!transcript.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: transcript }]);
    setLoading(true);
    setCoachingTip(null);

    const currentQuestion = messages.length > 0
      ? [...messages].reverse().find((message) => message.role === 'assistant')?.content || ''
      : '';

    try {
      const nextQuestionPromise = fetch(`${BACKEND_URL}/api/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer: transcript }),
      });

      const analyzePromise = fetch(`${BACKEND_URL}/api/analyze-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question: currentQuestion, answer: transcript, audioMeta: { duration: 10 } }),
      });

      const [resNext, resAnalyze] = await Promise.all([nextQuestionPromise, analyzePromise]);

      const data = await resNext.json();
      if (!resNext.ok) throw new Error(data.error || 'Failed to get response');

      if (resAnalyze.ok) {
        const analyzeData = await resAnalyze.json();
        if (analyzeData.tip) setCoachingTip(analyzeData.tip);
        if (analyzeData.speech) setPulseMetrics(analyzeData.speech);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.question }]);
      if (data.phase) setPhase(data.phase);

      void speakResponse(data.question);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'system', content: 'Connection error while fetching AI response.' }]);
      speakBrowserFallback("I'm sorry, I encountered an error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden items-center">
      <div className="w-full max-w-4xl p-6 flex justify-between items-center bg-slate-950/80 backdrop-blur z-20 border-b border-slate-800">
        <h2 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
          Intervue <span className="text-sm text-[#E1E2EB]/50 ml-2 font-light">Cinematic Analyst</span>
        </h2>
        <div className="flex gap-4 items-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-[#4B4DD8]/20 text-[#C0C1FF] border border-[#4B4DD8]/30 uppercase tracking-widest shadow-[0_0_15px_rgba(75,77,216,0.2)]">
            Phase: {phase}
          </div>
          <button
            onClick={() => router.push(`/analytics?sessionId=${sessionId}`)}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-[#E1E2EB] hover:text-white border border-[#464555]/30 hover:bg-white/10 uppercase tracking-widest transition-all"
          >
            End Session
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col relative h-full">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pb-40">
          {voiceNotice && (
            <div className="mx-auto w-full max-w-[85%] md:max-w-[75%] rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              {voiceNotice}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 md:p-6 text-base md:text-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-none shadow-lg tracking-wide'
                    : msg.role === 'system'
                      ? 'bg-red-950/30 text-red-300 border border-red-900/50 italic w-full text-center'
                      : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700 shadow-xl backdrop-blur-sm tracking-wide leading-relaxed'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {(loading || isConverting) && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-none p-5 flex flex-col items-center justify-center gap-3 min-w-[140px] shadow-xl backdrop-blur-sm">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-[bounce_1s_infinite_0ms]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_150ms]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 animate-[bounce_1s_infinite_300ms]"></div>
                </div>
                <span className="text-sm text-slate-400 font-semibold">{isConverting ? 'Transcribing...' : 'Thinking...'}</span>
              </div>
            </div>
          )}

          {(coachingTip || pulseMetrics) && !loading && (
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2 duration-500 mt-4">
              {pulseMetrics && (
                <div className="w-full max-w-[85%] md:max-w-[75%] bg-[#1D2026]/80 border border-[#464555]/20 p-4 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl flex justify-between items-center relative overflow-hidden">
                  <div className="flex items-center gap-3 z-10">
                    <div className="flex items-end gap-1 h-6">
                      <span className="w-1.5 h-3 bg-[#89CEFF] rounded-full animate-pulse blur-[1px]"></span>
                      <span className="w-1.5 h-5 bg-[#89CEFF] rounded-full animate-[pulse_1s_infinite_100ms] blur-[1px]"></span>
                      <span className="w-1.5 h-4 bg-[#89CEFF] rounded-full animate-[pulse_1s_infinite_200ms] blur-[1px]"></span>
                      <span className="w-1.5 h-6 bg-[#89CEFF] rounded-full animate-[pulse_1s_infinite_300ms] blur-[0.5px]"></span>
                      <span className="w-1.5 h-3 bg-[#89CEFF] rounded-full animate-[pulse_1s_infinite_400ms] blur-[1px]"></span>
                    </div>
                    <span className="text-[10px] font-bold text-[#89CEFF] tracking-widest uppercase ml-2">Pulse Monitor</span>
                  </div>
                  <div className="flex gap-4 z-10 text-xs font-mono text-[#E1E2EB]/80">
                    <span className="px-2 py-1 bg-[#0B0E14] rounded-md border border-[#464555]/30">Lat: {pulseMetrics.latency}s</span>
                    <span className="px-2 py-1 bg-[#0B0E14] rounded-md border border-[#464555]/30">Spd: {pulseMetrics.speechRate}wpm</span>
                    <span className="px-2 py-1 bg-[#0B0E14] rounded-md border border-[#464555]/30 uppercase text-[10px] flex items-center">
                      Conf: {pulseMetrics.confidenceSignal}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#89CEFF]/5 to-transparent z-0"></div>
                </div>
              )}

              {coachingTip && (
                <div className="w-full max-w-[85%] md:max-w-[75%] bg-[#1D2026] border border-[#464555]/15 p-5 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2FD9F4] opacity-80 shadow-[0_0_10px_#2FD9F4]"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[#2FD9F4]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    <span className="text-xs font-bold text-[#E1E2EB] tracking-widest uppercase">AI Coaching Tip</span>
                  </div>
                  <p className="text-sm text-[#E1E2EB]/80 leading-relaxed">{coachingTip}</p>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} className="h-10" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col items-center justify-end pointer-events-none z-10 w-full">
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              onClick={toggleRecording}
              disabled={loading || isConverting}
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative mb-4 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-pulse scale-105'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:-translate-y-1'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" rx="1" />
                </svg>
              ) : (
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            <span className="text-sm font-bold text-slate-400 tracking-widest uppercase bg-slate-900/80 px-4 py-1.5 rounded-full backdrop-blur border border-slate-700 shadow-lg">
              {isRecording ? 'Listening... Click to Send' : 'Click to Speak'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
