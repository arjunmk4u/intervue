# Intervue: Live AI Technical Intervewer

An interactive, voice-first interview simulator built with a modern Next.js frontend and an Express backend. It provides an immersive, premium SaaS experience designed to help you nail your next technical or behavioral interview.

![Intervue Preview](https://via.placeholder.com/800x400/f4f8fb/4a8394?text=Intervue+Voice-First+AI)

## ✨ What's New in this Version

Intervue has been completely overhauled with a focus on perceived performance and a premium user experience:


- **Premium Light Mode UI:** We overhauled the Analytics Assessment page to seamlessly match the Landing page, utilizing glassmorphism, soft shadow elevations, and cohesive color palettes (`#f4f8fb`, `#4a8394`, `#72abad`).
- **Tactile Micro-Interactions:** Everything you can interact with now reacts. Buttons and cards feature `active:scale-[0.97]` click-states that rebound immediately upon interaction to let you know the system is listening.

## 🚀 Core Features

- **Voice-First Experience:** Speak your answers naturally. No typing or pressure. The AI interviewer asks questions phase-by-phase (intro, behavioral, technical).
- **Real-Time AI Coaching:** Get instant evaluation powered by **Groq** on every answer, analyzing your depth, structure, and confidence.
- **Detailed Analytics & Reports:** Review a full session breakdown with your transcribed answers, latency metrics, speaking rate, skipped filler words, and actionable next steps.
- **Seamless Speech & Transcription:** Employs **Deepgram** for lightning-fast speech-to-text and `edge-tts` to deliver spoken questions with natural, human-like pacing. Gracefully degrades to text-only if playback fails.
- **Resume Parsing Setup:** Optionally upload your resume to generate hyper-personalized interview flows.

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 App Router, React, Tailwind CSS, Framer Motion (principles integrated natively via CSS variables)
- **Backend:** Node.js, Express, TypeScript, MongoDB
- **AI / Voice Services:** Groq (LLM Inference), Deepgram (Transcription), Edge-TTS (Audio Voice Synthesis)

---

## 💻 Environment Setup

### Backend Config
Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/live-interview-bot
GROQ_API_KEY=your_groq_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
```

### Frontend Config
Create a `.env.local` file inside the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

---

## 🏃 Running the Application locally

### 1. Start the Backend API
The backend requires MongoDB to be running and valid API credentials for Groq and Deepgram.

```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```

Now open [http://localhost:3000](http://localhost:3000) in your browser to begin testing.

---

## 🏗 Production Build 

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## 🧠 Design Philosophy

Our UI philosophy relies on the concept that unseen details compound:
1. Interfaces shouldn't jump or abruptly change state. We use blurring and fading combinations for rendering the status UI and loaders.
2. Transitions stay below 300ms to maximize perceived performance.
3. Every component features a distinct hover (`lift`) and an active click state (`scale`), providing direct visual feedback upon gesture.
