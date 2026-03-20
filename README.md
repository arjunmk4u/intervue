# Live AI Interview Bot

An interactive, 1-on-1 voice-based AI interviewer application. Built with a Next.js React frontend and an Express Node.js backend. The AI dynamically generates rigorous interview phases based on your uploaded resume.

## Features Let's Go
- **Groq Llama-3.3-70b AI Engine**: Instantaneous, ultra-fast interview prompt generation, simulating a real technical/behavioral loop.
- **Deepgram Local Microphone Transcription**: Flawless foreground STT transcription using `MediaRecorder` direct-to-Deepgram endpoints.
- **HeyGen WebRTC Avatar Streaming**: Integrates the native `@heygen/streaming-avatar` SDK to generate real-time visual lip-syncs alongside AI utterances.
- **Resilient Fallback Voice Synthesis**: Built-in resilient Native `window.speechSynthesis` ensures your interview continues completely hands-free via TTS audio even if WebRTC streams drop or account rate-limits are reached.

## Getting Started

### 1. Project Configuration
Add `.env` inside `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/live-interview-bot
GROQ_API_KEY=your_groq_key
HEYGEN_API_KEY=your_heygen_key
DEEPGRAM_API_KEY=your_deepgram_key
```

Add `.env.local` inside `frontend/`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 2. Starting the Express Backend
```bash
cd backend
npm install
npm run build
npm start # or npm run dev
```

### 3. Starting the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```

Browse to `http://localhost:3000` to start your hyper-realistic live interview!
