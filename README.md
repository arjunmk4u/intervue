# Live AI Interview Bot

An interactive voice interview simulator built with a Next.js frontend and an Express backend. The app generates interview questions, records answers, transcribes speech, analyzes performance, and reads prompts aloud during the session.

## Current Stack
- `frontend/`: Next.js 14 app-router UI
- `backend/`: Express + TypeScript API
- Groq: question generation and interview logic
- Deepgram: microphone transcription
- Gemini TTS: primary spoken interviewer voice
- Browser Speech Synthesis: automatic fallback voice when Gemini TTS is unavailable

## Features
- Dynamic interview flow with phase-based questioning
- Resume upload support during session setup
- Live microphone recording and transcription
- Performance analytics dashboard with speech and behavioral metrics
- Gemini text-to-speech playback for interviewer prompts
- Automatic browser voice fallback when Gemini TTS fails, is blocked by autoplay rules, or hits API quota limits

## Important TTS Note
Gemini voice output depends on the quota available to your `GEMINI_API_KEY`.

If Gemini TTS returns quota or availability errors, the app now:
- surfaces the failure reason from the backend
- temporarily stops retrying Gemini during the cooldown window
- falls back to browser speech so the interview remains usable

## Environment Setup

### Backend
Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/live-interview-bot
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
DEEPGRAM_API_KEY=your_deepgram_key
```

### Frontend
Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Run Locally

### 1. Start the backend
```bash
cd backend
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```

### 2. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Checks

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Notes
- The backend expects MongoDB, Groq, Gemini, and Deepgram credentials to be configured before startup.
- Browser TTS fallback still depends on the client allowing speech/audio playback after user interaction.
- Gemini TTS model availability and quota are controlled by Google and can change over time.
