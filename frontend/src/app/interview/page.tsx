'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StreamingAvatar, { AvatarQuality, StreamingEvents } from '@heygen/streaming-avatar';

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function InterviewRoom() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [phase, setPhase] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Avatar and Voice State
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const [isAvatarStarting, setIsAvatarStarting] = useState(false);
  const [isAvatarFailed, setIsAvatarFailed] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

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
    
    if (firstQuestion) {
      setMessages([{ role: 'assistant', content: firstQuestion }]);
      const avatarEnabled = localStorage.getItem('avatarEnabled');
      if (avatarEnabled === 'true') {
        initializeAvatarSession(firstQuestion);
      } else {
        // Fallback speech synthesis if avatar is disabled entirely
        speakFallback(firstQuestion);
      }
    }
    
    return () => {
      // Cleanup avatar session
      if (avatar) {
        avatar.stopAvatar();
      }
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fallback Native TTS in case HeyGen 400 errors
  const speakFallback = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const initializeAvatarSession = async (initialIntro: string) => {
    setIsAvatarStarting(true);
    setIsAvatarFailed(false);
    let avatarInstance: StreamingAvatar | null = null;
    try {
      // 1. Fetch valid token from our backend
      const res = await fetch(`${BACKEND_URL}/api/avatar/token`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error("Token fetch failed. Check backend HEYGEN_API_KEY.");

      // 2. Instantiate HeyGen StreamingAvatar
      avatarInstance = new StreamingAvatar({ token: data.token });
      setAvatar(avatarInstance);

      // 3. Bind events
      avatarInstance.on(StreamingEvents.STREAM_READY, (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play().catch(console.error);
          };
        }
      });

      avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        if (videoRef.current) videoRef.current.srcObject = null;
      });

      // 4. Start the session using a solid generic Avatar
      await avatarInstance.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: 'Anna_public_3_20240108', // Highly reliable public avatar
      });

      // 5. Speak the initial intro once connected
      await avatarInstance.speak({ text: initialIntro });

    } catch (err) {
      console.error('Error starting avatar session:', err);
      setIsAvatarFailed(true);
      if (avatarInstance) avatarInstance.stopAvatar();
      
      // FALLBACK to native browser speech if HeyGen fails (400 error)
      speakFallback(initialIntro);
    } finally {
      setIsAvatarStarting(false);
    }
  };

  // DEEPGRAM Native MediaRecorder Setup
  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      // Stop recording
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
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
            body: formData
          });
          const data = await res.json();
          if (data.transcript) {
            handleVoiceSubmit(data.transcript);
          } else {
            console.warn("Deepgram returned empty transcript");
          }
        } catch (err) {
          console.error("Transcription error:", err);
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

    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer: transcript })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: data.question }]);
      if (data.phase) setPhase(data.phase);
      
      // Pass the response to the HeyGen Avatar OR fallback TTS
      if (data.avatar?.enabled && !isAvatarFailed && avatar) {
        await avatar.speak({ text: data.avatar.text });
      } else {
        speakFallback(data.question);
      }
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', content: 'Connection error while fetching AI response.' }]);
      speakFallback("I'm sorry, I encountered an error connecting to my brain. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Left section: Visual Avatar Video Feed */}
      <div className="flex flex-col lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center lg:block">
          <h2 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent lg:hidden">AI Interviewer</h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider shadow-[0_0_15px_rgba(79,70,229,0.2)]">
            Phase: {phase}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center group shrink-0">
            {isAvatarStarting ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                <span className="text-sm font-semibold text-slate-400">Connecting Video...</span>
              </div>
            ) : isAvatarFailed ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-sm font-semibold text-slate-400">Video Failed. Audio Mode Active.</span>
              </div>
            ) : (
              <video 
                ref={videoRef}
                id="avatarStream" 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            )}
            
            <div className="absolute bottom-4 left-4 right-4 flex justify-center z-10">
              <div className="px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur text-xs font-bold text-slate-300 tracking-widest uppercase border border-slate-800 shadow-lg">
                {isAvatarStarting ? "Initializing..." : isAvatarFailed ? "Voice Only" : "Active AI"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right section: Chat Interface */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pb-32">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div 
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 md:p-5 text-sm md:text-base ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-none shadow-lg' 
                    : msg.role === 'system'
                    ? 'bg-red-950/30 text-red-300 border border-red-900/50 italic w-full text-center'
                    : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700 shadow-xl backdrop-blur-sm'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {(loading || isConverting) && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-none p-5 flex flex-col items-center justify-center gap-3 min-w-[120px] shadow-xl backdrop-blur-sm">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-[bounce_1s_infinite_0ms]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_150ms]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 animate-[bounce_1s_infinite_300ms]"></div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{isConverting ? "Transcribing..." : "Thinking..."}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* VOICE U.I BOTTOM BAR */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center justify-end pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center pb-2">
            <button
              onClick={toggleRecording}
              disabled={loading || isAvatarStarting || isConverting}
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative mb-3 ${
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
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur border border-slate-800">
              {isRecording ? "Listening... Click to Send" : "Click to Speak"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
