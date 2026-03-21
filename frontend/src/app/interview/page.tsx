'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

interface VoicePayload {
  enabled?: boolean;
  text?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function InterviewRoom() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [phase, setPhase] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMountedRef = useRef<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interactionRetryHandlerRef = useRef<(() => void) | null>(null);
  const playRequestIdRef = useRef(0);
  const initialSpeakRef = useRef<boolean>(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const unregisterPlaybackRetry = () => {
    if (typeof window === 'undefined' || !interactionRetryHandlerRef.current) return;

    window.removeEventListener('pointerdown', interactionRetryHandlerRef.current);
    window.removeEventListener('keydown', interactionRetryHandlerRef.current);
    interactionRetryHandlerRef.current = null;
  };

  const stopCurrentAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.currentTime = 0;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const speakResponse = async (text: string): Promise<void> => {
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

      const data = await res.json() as { audioUrl?: string | null; audioBase64?: string | null; mimeType?: string };
      
      if (!isMountedRef.current || requestId !== playRequestIdRef.current) {
        console.warn(`[Voice] Request ${requestId} superseded or component unmounted.`);
        return;
      }

      if (!data.audioUrl) {
        console.error('[Voice] No audio URL received');
        setIsSpeaking(false);
        return;
      }

      const sourceUrl = `${BACKEND_URL}${data.audioUrl}`;
      console.log(`[Voice] Playing from URL: ${sourceUrl} (ID: ${requestId})`);

      audio.src = sourceUrl;
      audio.currentTime = 0;
      audio.load();

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
  };

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
      void speakResponse(firstQuestion);
    }

    return () => {
      isMountedRef.current = false;
      unregisterPlaybackRetry();

      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      stopCurrentAudio();
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
            void handleVoiceSubmit(data.transcript);
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
    if (!transcript.trim() || loading || isSpeaking) return;

    setMessages((prev) => [...prev, { role: 'user', content: transcript }]);
    setLoading(true);

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

      const data = await resNext.json() as { question: string; phase?: string; voice?: VoicePayload; error?: string };
      if (!resNext.ok) throw new Error(data.error || 'Failed to get response');

      if (resAnalyze.ok) {
        await resAnalyze.json();
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.question }]);
      if (data.phase) setPhase(data.phase);

      if (data.voice?.enabled) {
        await speakResponse(data.voice.text || data.question);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'system', content: 'Connection error while fetching AI response.' }]);
      setIsSpeaking(false);
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

          <div ref={messagesEndRef} className="h-10" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col items-center justify-end pointer-events-none z-10 w-full">
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              onClick={toggleRecording}
              disabled={loading || isConverting || isSpeaking}
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
              {isSpeaking ? 'Interviewer speaking...' : isRecording ? 'Listening... Click to Send' : 'Click to Speak'}
            </span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => {
          console.log('[Voice] Audio playback ended');
          setIsSpeaking(false);
        }}
        onError={(e) => {
          console.error('[Voice] Audio element error:', e);
          setIsSpeaking(false);
        }}
        onLoadedMetadata={(e) => {
          console.log(`[Voice] Audio metadata loaded, duration: ${e.currentTarget.duration}s`);
        }}
      />
    </div>
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}
