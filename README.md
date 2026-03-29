# Live AI Interview Bot

An interactive voice interview simulator built with a Next.js frontend and an Express backend. The app generates interview questions, records answers, transcribes speech, analyzes performance, and reads prompts aloud during the session.

## Current Stack
- `frontend/`: Next.js 14 app-router UI
- `backend/`: Express + TypeScript API
- Groq: question generation and interview logic
- Deepgram: microphone transcription
- edge-tts: primary spoken interviewer voice

## Features
- Dynamic interview flow with phase-based questioning
- Resume upload support during session setup
- Live microphone recording and transcription
- Performance analytics dashboard with speech and behavioral metrics
- edge-tts powered interviewer playback with natural human-like pacing
- Graceful no-audio fallback when TTS generation or playback fails

## Important TTS Note
Voice output is generated on the backend with `edge-tts` and served as MP3 files.

If TTS generation or playback fails, the interview flow continues without blocking the question/answer cycle.

## Environment Setup

### Backend
Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/live-interview-bot
GROQ_API_KEY=your_groq_key
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
- The backend expects MongoDB, Groq, and Deepgram credentials to be configured before startup.
- Voice output uses `edge-tts` with text preprocessing to make the interviewer sound calmer and more conversational.
- Audio playback still depends on the browser allowing media playback after user interaction.
