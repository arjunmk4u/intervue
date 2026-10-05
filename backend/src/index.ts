import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import authRoutes from './routes/auth';
import interviewRoutes from './routes/interview';
import historyRoutes from './routes/history';
import transcribeRoutes from './routes/transcribe';
import voiceRoutes from './voice/voice.routes';

import { env } from './config/env';

const app = express();
const PORT = env.PORT;
const MONGODB_URI = env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use(cors({
  origin: true, // Echoes the request origin, allowing cross-origin credentials in local/dev
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', interviewRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/voice', voiceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Interview Simulator API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
