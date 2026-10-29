'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, BACKEND_URL } from '@/lib/api';

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

interface VoicePayload {
  enabled?: boolean;
  text?: string;
}

interface AudioMetaPayload {
  duration: number | null;
  latency: number | null;
}

export default function InterviewRoom() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [closingStatus, setClosingStatus] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [phase, setPhase] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMountedRef = useRef<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const interactionRetryHandlerRef = useRef<(() => void) | null>(null);
  const playRequestIdRef = useRef(0);
  const initialSpeakRef = useRef<boolean>(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const promptReadyAtRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const sleep = useCallback((ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  }), []);

  const waitForAudioPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src || audio.paused || audio.ended) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        resolve();
      };

      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
    });
  }, []);

  const unregisterPlaybackRetry = useCallback(() => {
    if (typeof window === 'undefined' || !interactionRetryHandlerRef.current) return;

    window.removeEventListener('pointerdown', interactionRetryHandlerRef.current);
    window.removeEventListener('keydown', interactionRetryHandlerRef.current);
    interactionRetryHandlerRef.current = null;
  }, []);

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    audio.removeAttribute('src');
    audio.load();
    audio.currentTime = 0;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const speakResponse = useCallback(async (text: string): Promise<void> => {
    if (!isMountedRef.current) return;

    playRequestIdRef.current += 1;
    const requestId = playRequestIdRef.current;

    unregisterPlaybackRetry();
    stopCurrentAudio();

    const audio = audioRef.current;
    if (!audio) {
      console.error('[Voice] Audio element not found');
      return;
    }

    try {
      console.log(`[Voice] Requesting speech for: "${text.slice(0, 30)}..." (ID: ${requestId})`);
      setIsSpeaking(true);

      const res = await fetch(`${BACKEND_URL}/api/voice/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Voice] Backend error:', errorData);
        if (requestId === playRequestIdRef.current) {
          setIsSpeaking(false);
        }
        return;
      }

      if (!res.body) {
        console.error('[Voice] No readable stream');
        setIsSpeaking(false);
        return;
      }

      const reader = res.body.getReader();
      const mimeType = 'audio/mpeg';
      const useMSE = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(mimeType);

      if (useMSE) {
        const mediaSource = new MediaSource();
        const sourceUrl = URL.createObjectURL(mediaSource);
        audioUrlRef.current = sourceUrl;
        audio.src = sourceUrl;

        mediaSource.addEventListener('sourceopen', () => {
          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          const queue: Uint8Array[] = [];

          const appendNext = () => {
             if (mediaSource.readyState !== 'open') return;
             if (queue.length > 0 && !sourceBuffer.updating) {
                try {
                  const chunk = queue.shift()!;
                  sourceBuffer.appendBuffer(new Uint8Array(chunk));
                } catch (e) {
                  console.error('[Voice] MSE append issue:', e);
                }
             }
          };

          let doneReading = false;

          sourceBuffer.addEventListener('updateend', () => {
             appendNext();
             if (queue.length === 0 && !sourceBuffer.updating && doneReading && mediaSource.readyState === 'open') {
               try { mediaSource.endOfStream(); } catch {}
             }
          });

          let firstPlay = true;

          const readLoop = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (!isMountedRef.current || requestId !== playRequestIdRef.current || mediaSource.readyState === 'closed') {
                   reader.cancel().catch(() => {});
                   break;
                }

                if (done) {
                   doneReading = true;
                   if (queue.length === 0 && !sourceBuffer.updating && mediaSource.readyState === 'open') {
                      try { mediaSource.endOfStream(); } catch {}
                   }
                   break;
                }

                if (value) {
                  queue.push(value);
                  appendNext();
                  if (firstPlay) {
                    firstPlay = false;
                    audio.play().catch(playError => {
                       console.warn('[Voice] Autoplay blocked, waiting for interaction.', playError);
                    });
                  }
                }
              }
            } catch (err) {
              console.error('[Voice] Stream read error', err);
              if (mediaSource.readyState === 'open') {
                 try { mediaSource.endOfStream('network'); } catch {}
              }
            }
          };

          void readLoop();
        }, { once: true });

      } else {
        // Fallback mechanism buffer all chunks
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (!isMountedRef.current || requestId !== playRequestIdRef.current) {
              reader.cancel().catch(() => {});
              break;
            }
            if (done) break;
            if (value) chunks.push(value);
          }
          if (chunks.length > 0 && requestId === playRequestIdRef.current) {
             const blob = new Blob(chunks.map(chunk => new Uint8Array(chunk)), { type: 'audio/mpeg' });
             const sourceUrl = URL.createObjectURL(blob);
             audioUrlRef.current = sourceUrl;
             audio.src = sourceUrl;
             audio.currentTime = 0;
             await audio.play().catch(playError => console.warn('[Voice] Autoplay blocked:', playError));
          }
        } catch (err) {
          console.error('[Voice] Fallback Stream read error', err);
        }
      }
    } catch (error) {
      console.error('[Voice] Speak request failed:', error);
      if (requestId === playRequestIdRef.current) {
        setIsSpeaking(false);
      }
    }
  }, [stopCurrentAudio, unregisterPlaybackRetry]);

  const runClosingSequence = useCallback(async (latestAnswer: string) => {
    setClosingStatus('Wrapping up your interview...');

    const res = await apiFetch('/api/closing-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answer: latestAnswer }),
    });

    const data = await res.json() as { message?: string; voice?: VoicePayload; error?: string };
    if (!res.ok || !data.message) {
      throw new Error(data.error || 'Failed to generate closing message');
    }

    const closingText = data.message;

    setMessages((prev) => [...prev, { role: 'assistant', content: closingText }]);
    promptReadyAtRef.current = Date.now();

    if (data.voice?.enabled) {
      await speakResponse(data.voice.text || closingText);
    }
    await waitForAudioPlayback();

    if (!isMountedRef.current) return;

    setClosingStatus('Generating your assessment...');
    await sleep(1000);

    if (!isMountedRef.current) return;

    router.push(`/analytics?sessionId=${sessionId}`);
  }, [router, sessionId, sleep, speakResponse, waitForAudioPlayback]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    isMountedRef.current = true;
    const storedSession = localStorage.getItem('sessionId');
    const firstQuestion = localStorage.getItem('firstQuestion');
    const storedPhase = localStorage.getItem('currentPhase');

    console.log('[Interview] Initializing session...', { storedSession, hasFirstQuestion: !!firstQuestion });

    if (!storedSession) {
      router.push('/');
      return;
    }

    setSessionId(storedSession);
    if (storedPhase) setPhase(storedPhase);

    if (firstQuestion && !initialSpeakRef.current) {
      initialSpeakRef.current = true;
      setMessages([{ role: 'assistant', content: firstQuestion }]);
      promptReadyAtRef.current = Date.now();
      void speakResponse(firstQuestion);
    }

    return () => {
      isMountedRef.current = false;
      unregisterPlaybackRetry();

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      stopCurrentAudio();
    };
  }, [router, speakResponse, stopCurrentAudio, unregisterPlaybackRetry, user, authLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
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
        const startedAt = recordingStartedAtRef.current;
        const duration =
          startedAt !== null ? Number(((Date.now() - startedAt) / 1000).toFixed(1)) : null;
        const latency =
          promptReadyAtRef.current !== null && startedAt !== null
            ? Number(Math.max(0, (startedAt - promptReadyAtRef.current) / 1000).toFixed(1))
            : null;
        const formData = new FormData();
        formData.append('audio', audioBlob, 'record.webm');

        try {
          const res = await apiFetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            void handleVoiceSubmit(data.transcript, { duration, latency });
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          recordingStartedAtRef.current = null;
          mediaRecorderRef.current = null;
          setIsConverting(false);
        }
      };

      recorder.start();
      recordingStartedAtRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone! Please ensure permissions are granted.');
    }
  };

  const handleVoiceSubmit = async (transcript: string, audioMeta: AudioMetaPayload) => {
    if (loading || isSpeaking || Boolean(closingStatus)) return;

    const isClosingPhase = phase === 'closing';

    if (!transcript.trim()) {
      if (isClosingPhase) {
        await runClosingSequence('No further questions.');
      }
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: transcript }]);
    setLoading(true);

    const currentQuestion = messages.length > 0
      ? [...messages].reverse().find((message) => message.role === 'assistant')?.content || ''
      : '';

    try {
      const analyzePromise = apiFetch('/api/analyze-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, phase, question: currentQuestion, answer: transcript, audioMeta }),
      });

      if (isClosingPhase) {
        const resAnalyze = await analyzePromise;
        if (resAnalyze.ok) {
          await resAnalyze.json();
        }

        await runClosingSequence(transcript);
        return;
      }

      const nextQuestionPromise = apiFetch('/api/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer: transcript }),
      });

      const [resNext, resAnalyze] = await Promise.all([nextQuestionPromise, analyzePromise]);

      const data = await resNext.json() as { question: string; phase?: string; voice?: VoicePayload; error?: string };
      if (!resNext.ok) throw new Error(data.error || 'Failed to get response');

      if (resAnalyze.ok) {
        await resAnalyze.json();
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.question }]);
      if (data.phase) setPhase(data.phase);
      promptReadyAtRef.current = Date.now();

      if (data.voice?.enabled) {
        await speakResponse(data.voice.text || data.question);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'system', content: 'Connection error while fetching AI response.' }]);
      setIsSpeaking(false);
      setClosingStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] h-[100dvh] bg-[#f4f8fb] text-slate-800 font-sans selection:bg-[#72abad]/30 overflow-hidden relative flex flex-col">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#cdebe7]/50 via-[#f4f8fb] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#72abad]/20 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#cdebe7]/40 blur-[100px] pointer-events-none z-0"></div>

      {/* Navbar - Fixed Height */}
      <nav className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.3)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" /></svg>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-manrope">Intervue</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="hidden sm:inline-block text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Dashboard
          </Link>
          {phase && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-[9px] sm:text-[10px] font-bold text-[#4a8394] uppercase tracking-wider max-w-[120px] sm:max-w-none truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse shrink-0"></span>
              <span className="truncate">{phase.replace('-', ' ')}</span>
            </div>
          )}
          <button
            onClick={() => router.push(`/analytics?sessionId=${sessionId}`)}
            className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100/50 uppercase tracking-widest transition-all active:scale-[0.97] hover:scale-[1.02] duration-200 ease-emil-out min-h-[34px] flex items-center justify-center whitespace-nowrap"
          >
            End Interview
          </button>
        </div>
      </nav>

      {/* Chat Area - Scrollable */}
      <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-8 pt-4 sm:pt-8 pb-10 space-y-4 sm:space-y-6 md:space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 ease-emil-out transform-gpu`}>
              <div
                className={`group relative max-w-[92%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-sm sm:text-base md:text-lg transition-all break-words [overflow-wrap:anywhere] ${msg.role === 'user'
                  ? 'bg-slate-900 border border-slate-700 text-white rounded-tr-sm shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]'
                  : msg.role === 'system'
                    ? 'bg-red-50/80 text-red-600 border border-red-200 italic w-full text-center py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl'
                    : 'bg-white/90 text-slate-800 rounded-tl-sm border border-slate-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl'
                  }`}
              >
                {msg.role === 'assistant' && (
                  <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-sm shrink-0">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="20" r="17" />
                        <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
                      </svg>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">Interviewer</span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="mb-2 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">You</div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
              </div>
            </div>
          ))}

          {(loading || isConverting || closingStatus) && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 ease-emil-out">
              <div className="bg-white/80 border border-slate-200 rounded-2xl rounded-tl-none p-4 sm:p-6 flex flex-col items-center justify-center gap-3 sm:gap-4 min-w-[140px] sm:min-w-[160px] backdrop-blur-sm shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4a8394] animate-[bounce_1s_infinite_0ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#72abad] animate-[bounce_1s_infinite_200ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#cdebe7] animate-[bounce_1s_infinite_400ms]"></div>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center px-1">
                  {closingStatus || (isConverting ? 'Transcribing...' : 'Thinking...')}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-20 sm:h-28" />
        </div>
      </div>

      {/* Control Area - Bottom Controls with Safe Area */}
      <div className="relative z-20 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-2 sm:pt-3 px-4 sm:px-6 bg-gradient-to-t from-[#f4f8fb] via-[#f4f8fb]/95 to-transparent border-t border-slate-200/40 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col items-center relative">

          {/* Speaking/Recording Indicator */}
          <div className={`transition-all duration-300 ease-out mb-2 ${isSpeaking || isRecording || isConverting || closingStatus ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none h-0 overflow-hidden mb-0'}`}>
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-white/95 border border-slate-200 shadow-md backdrop-blur-xl max-w-[90vw]">
              <div className="flex gap-1 items-center justify-center w-5 shrink-0">
                <div className={`w-1 bg-slate-800 rounded-full transition-all duration-300 ${isSpeaking || isRecording ? 'h-3.5 animate-[stretch_0.5s_infinite_alternate]' : 'h-1'}`}></div>
                <div className={`w-1 bg-slate-600 rounded-full transition-all duration-300 ${isSpeaking || isRecording ? 'h-5 animate-[stretch_0.5s_infinite_alternate_0.1s]' : 'h-1'}`}></div>
                <div className={`w-1 bg-slate-400 rounded-full transition-all duration-300 ${isSpeaking || isRecording ? 'h-2.5 animate-[stretch_0.5s_infinite_alternate_0.2s]' : 'h-1'}`}></div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
                {closingStatus || (isSpeaking ? 'Interviewer Speaking' : isRecording ? 'Listening...' : 'Processing')}
              </span>
            </div>
          </div>

          <button
            onClick={toggleRecording}
            disabled={loading || isConverting || isSpeaking || Boolean(closingStatus)}
            aria-label={isRecording ? 'Stop recording answer' : 'Start recording answer'}
            className={`group relative w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full flex items-center justify-center transition-all duration-300 ease-emil-out ${isRecording
              ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-105'
              : 'bg-slate-900 hover:bg-slate-800 shadow-[0_8px_25px_-5px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_35px_-5px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 active:scale-[0.97]'
              } disabled:opacity-40 disabled:scale-95 disabled:hover:translate-y-0 disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white rounded-lg shadow-inner scale-in-center"></div>
            ) : (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            {/* Pulsing ring when active */}
            {(isRecording || isSpeaking) && (
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping opacity-30 pointer-events-none"></div>
            )}
          </button>

          <div className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center px-2">
            {closingStatus ? closingStatus : isSpeaking ? 'Please wait...' : isRecording ? 'Click to finish' : 'Tap to start speaking'}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onEnded={() => {
          console.log('[Voice] Audio playback ended');
          promptReadyAtRef.current = Date.now();
          setIsSpeaking(false);
        }}
        onError={(e) => {
          console.error('[Voice] Audio element error:', e);
          promptReadyAtRef.current = Date.now();
          setIsSpeaking(false);
        }}
        onLoadedMetadata={(e) => {
          console.log(`[Voice] Audio metadata loaded, duration: ${e.currentTarget.duration}s`);
        }}
      />

      <style jsx global>{`
        @keyframes stretch {
          from { height: 4px; opacity: 0.5; }
          to { height: 16px; opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </main>
  );
}

// function base64ToBlob(base64: string, mimeType: string): Blob {
//   const binary = atob(base64);
//   const bytes = new Uint8Array(binary.length);

//   for (let i = 0; i < binary.length; i += 1) {
//     bytes[i] = binary.charCodeAt(i);
//   }

//   return new Blob([bytes], { type: mimeType });
// }
