import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ISession extends Document {
  sessionId: string;
  domain: string;
  resumeId?: mongoose.Types.ObjectId;
  phase: 'intro' | 'resume' | 'technical' | 'behavioral' | 'situational' | 'closing';
  questionIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  history: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const SessionSchema = new Schema<ISession>({
  sessionId: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
  phase: { 
    type: String, 
    enum: ['intro', 'resume', 'technical', 'behavioral', 'situational', 'closing'], 
    default: 'intro' 
  },
  questionIndex: { type: Number, default: 0 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  history: [MessageSchema]
}, { timestamps: true });

export default mongoose.model<ISession>('Session', SessionSchema);
