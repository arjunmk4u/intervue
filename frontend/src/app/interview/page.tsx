'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function InterviewRoom() {
  const router = useRouter();
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

      if (!isMountedRef.current || requestId !== playRequestIdRef.current) {
        console.warn(`[Voice] Request ${requestId} superseded or component unmounted.`);
        return;
      }

      const blob = await res.blob();
      if (!isMountedRef.current || requestId !== playRequestIdRef.current) {
        console.warn(`[Voice] Request ${requestId} superseded after audio download.`);
        return;
      }

      if (!blob.size) {
        console.error('[Voice] No audio data received');
        setIsSpeaking(false);
        return;
      }

      const sourceUrl = URL.createObjectURL(blob);
      audioUrlRef.current = sourceUrl;
      console.log(`[Voice] Playing streamed audio blob (ID: ${requestId})`);

      audio.src = sourceUrl;
      audio.currentTime = 0;

      try {
        await audio.play();
      } catch (playError) {
        if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
          console.warn('[Voice] Autoplay blocked, waiting for interaction.');
          // In a real app we might show a "Click to Listen" button
          // For now, we'll just log it.
          return;
        }

        console.error('[Voice] Audio play error:', playError);
        throw playError;
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

    const res = await fetch(`${BACKEND_URL}/api/closing-message`, {
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
  }, [router, speakResponse, stopCurrentAudio, unregisterPlaybackRetry]);

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
          const res = await fetch(`${BACKEND_URL}/api/transcribe`, {
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
    if (!transcript.trim() || loading || isSpeaking || Boolean(closingStatus)) return;

    setMessages((prev) => [...prev, { role: 'user', content: transcript }]);
    setLoading(true);

    const currentQuestion = messages.length > 0
      ? [...messages].reverse().find((message) => message.role === 'assistant')?.content || ''
      : '';

    const isClosingPhase = phase === 'closing';

    try {
      const analyzePromise = fetch(`${BACKEND_URL}/api/analyze-response`, {
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

      const nextQuestionPromise = fetch(`${BACKEND_URL}/api/next-question`, {
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
    <main className="h-screen bg-[#f4f8fb] text-slate-800 font-sans selection:bg-[#72abad]/30 overflow-hidden relative flex flex-col">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#cdebe7]/50 via-[#f4f8fb] to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#72abad]/20 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#cdebe7]/40 blur-[100px] pointer-events-none z-0"></div>

      {/* Navbar - Fixed Height */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#72abad] to-[#4a8394] flex items-center justify-center shadow-[0_0_15px_rgba(114,171,173,0.3)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="20" r="17" />
              <path d="M15 52 C15 48 22 44 30 44 L44 44 L50 58 L56 44 L70 44 C78 44 85 48 85 52 L68 118 C67 122 60 126 50 126 C40 126 33 122 32 118 Z" />
              <path d="M44 44 L50 58 L56 44 L52 44 L50 50 L48 44 Z" fill="rgba(74,131,148,0.6)" />
              <path d="M48 58 L46 80 L50 90 L54 80 L52 58 Z" fill="rgba(74,131,148,0.6)" /></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 font-manrope">Intervue</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-[#72abad]/30 bg-[#cdebe7]/50 text-[10px] font-bold text-[#4a8394] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4a8394] animate-pulse"></span>
            {phase.replace('-', ' ')}
          </div>
          <button
            onClick={() => router.push(`/analytics?sessionId=${sessionId}`)}
            className="px-4 py-1.5 rounded-full text-[10px] font-bold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100/50 uppercase tracking-widest transition-all"
          >
            End Interview
          </button>
        </div>
      </nav>

      {/* Chat Area - Scrollable */}
      <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500 transform-gpu`}>
              <div
                className={`group relative max-w-[85%] md:max-w-[80%] rounded-2xl p-5 md:p-6 text-base md:text-lg transition-all ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#4a8394] to-[#72abad] text-white rounded-tr-none shadow-[0_10px_30px_-10px_rgba(74,131,148,0.4)]'
                    : msg.role === 'system'
                      ? 'bg-red-50 text-red-600 border border-red-200 italic w-full text-center py-3'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xl backdrop-blur-md'
                  }`}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute -top-6 left-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interviewer</div>
                )}
                {msg.role === 'user' && (
                  <div className="absolute -top-6 right-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">You</div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed mix-blend-plus-lighter">{msg.content}</p>
              </div>
            </div>
          ))}

          {(loading || isConverting || closingStatus) && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white/80 border border-slate-200 rounded-2xl rounded-tl-none p-6 flex flex-col items-center justify-center gap-4 min-w-[160px] backdrop-blur-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4a8394] animate-[bounce_1s_infinite_0ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#72abad] animate-[bounce_1s_infinite_200ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#cdebe7] animate-[bounce_1s_infinite_400ms]"></div>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {closingStatus || (isConverting ? 'Transcribing...' : 'Thinking...')}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-32" />
        </div>
      </div>

      {/* Control Area - Fixed at Bottom */}
      <div className="relative z-20 pb-10 pt-4 px-6 bg-gradient-to-t from-[#f4f8fb] via-[#f4f8fb] to-transparent">
        <div className="max-w-3xl mx-auto flex flex-col items-center relative">

          {/* Speaking/Recording Indicator Overlay */}
          <div className={`absolute -top-16 left-1/2 -translate-x-1/2 transition-all duration-300 ${isSpeaking || isRecording || isConverting || closingStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/90 border border-slate-200 shadow-xl backdrop-blur-xl">
              <div className="flex gap-1 items-center">
                <div className={`w-1 h-3 bg-[#4a8394] rounded-full ${isSpeaking || isRecording ? 'animate-[stretch_0.5s_infinite_alternate]' : ''}`}></div>
                <div className={`w-1 h-5 bg-[#72abad] rounded-full ${isSpeaking || isRecording ? 'animate-[stretch_0.5s_infinite_alternate_0.1s]' : ''}`}></div>
                <div className={`w-1 h-2 bg-[#cdebe7] rounded-full ${isSpeaking || isRecording ? 'animate-[stretch_0.5s_infinite_alternate_0.2s]' : ''}`}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {closingStatus || (isSpeaking ? 'Interviewer Speaking' : isRecording ? 'Listening...' : 'Processing')}
              </span>
            </div>
          </div>

          <button
            onClick={toggleRecording}
            disabled={loading || isConverting || isSpeaking || Boolean(closingStatus)}
            className={`group relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording
                ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110'
                : 'bg-[#4a8394] hover:bg-[#3d6c7a] shadow-[0_4px_14px_0_rgba(74,131,148,0.39)] hover:shadow-[0_6px_20px_rgba(74,131,148,0.23)]'
              } disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-sm"></div>
            ) : (
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            {/* Pulsing ring when active */}
            {(isRecording || isSpeaking) && (
              <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping opacity-20"></div>
            )}
          </button>

          <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
