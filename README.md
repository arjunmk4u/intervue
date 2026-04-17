# Intervue

Voice-first mock interview practice built with a Next.js frontend, an Express + TypeScript backend, MongoDB session storage, Groq-powered interview/evaluation flows, Deepgram transcription, and Edge TTS voice playback.

![Intervue Banner](./banner.png)

## What the app currently does

- Starts a new interview session for one of these target roles: `Software Engineer`, `Data Scientist`, `Product Manager`, `Frontend Developer`, `Backend Developer`, `Full Stack Developer`, `Machine Learning Engineer`, `DevOps Engineer`
- Lets the candidate choose an experience level: `Fresher`, `1-2 years`, `3-5 years`, `5+ years`
- Optionally uploads a resume and stores parsed resume data against the session
- Runs a live interview in a chat-style voice UI
- Records spoken answers in the browser with `MediaRecorder`
- Sends recorded audio to Deepgram for transcription
- Generates the next interviewer question with Groq using the active interview phase, recent history, role, experience level, and resume context when available
- Speaks interviewer prompts back to the candidate using Edge TTS
- Analyzes every answer for technical quality, behavioral signals, and speech heuristics
- Produces a final session report with overall score, strengths, weaknesses, recommendations, speaking evidence, and per-question reviews

## Interview flow

The current backend phase order is:

1. `intro` - 1 question
2. `resume` - 3 questions
3. `technical` - 3 questions
4. `behavioral` - 2 questions
5. `situational` - 2 questions
6. `closing` - 1 final prompt before the closing message/report handoff

The frontend pages are:

- `/` landing page
- `/setup` session setup page
- `/interview` live interview room
- `/analytics` final report page

## Tech stack

- Frontend: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- Backend: Express 5, TypeScript, Mongoose
- LLM: Groq `llama-3.3-70b-versatile`
- Transcription: Deepgram `nova-2`
- Text to speech: `@andresaya/edge-tts` with `en-US-JennyNeural`
- Database: MongoDB

## Project structure

```text
.
|-- backend
|   |-- src
|   |   |-- analysis-engine
|   |   |-- config
|   |   |-- interview-engine
|   |   |-- models
|   |   |-- routes
|   |   |-- services
|   |   `-- voice
|-- frontend
|   `-- src
|       `-- app
|-- banner.png
|-- intervue.txt
`-- README.md
```

## Environment variables

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/live-interview-bot
GROQ_API_KEY=your_groq_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Notes:

- `GROQ_API_KEY` is required at backend startup.
- `DEEPGRAM_API_KEY` is effectively required for the live voice interview flow because transcription depends on it.
- MongoDB must be reachable before sessions/resumes/reports can be stored.

## How to run locally

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

Install and run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production commands

Backend:

```bash
cd backend
npm install
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm start
```

## API surface

Mounted from the backend:

- `GET /api/health`
- `POST /api/start-session`
- `POST /api/upload-resume`
- `POST /api/next-question`
- `POST /api/analyze-response`
- `POST /api/closing-message`
- `GET /api/final-report?sessionId=...`
- `POST /api/transcribe`
- `POST /api/voice/speak`

## How scoring works

Each analyzed answer stores:

- Technical scores: clarity, depth, relevance, structure, confidence
- Behavioral scores: leadership, ownership, problem solving, communication
- Speech heuristics: answer-start latency, speech rate, filler word count, confidence signal
- Coaching tip, strengths, and weaknesses

Final report weighting:

- 65% technical evaluation averages
- 25% behavioral averages
- 10% speaking metrics when available

## Current implementation notes

- Resume parsing is implemented with `pdf-parse`, so the backend is currently PDF-oriented. The setup UI accepts `.pdf` and `.docx`, but documented resume intelligence should be treated as PDF-backed in the current codebase.
- The app is voice-first, not video-based.
- Reports are session-based only. There is no user auth, multi-user dashboard, or long-term profile history in the current codebase.

## Developers

Intervue was built by:

- Arjun M K (`arjunmk4u`) - core interview engine, backend logic, session flow, voice/transcription orchestration, and analytics/reporting foundations
  GitHub: `https://github.com/arjunmk4u`
  Portfolio: `https://arjunmk.com`
- Jeevan Jijo - UI/UX implementation, frontend polish, and supporting app work across the experience
  GitHub: `https://github.com/Jeevan-Jijo`
