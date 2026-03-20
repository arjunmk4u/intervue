import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeData {
  skills: string[];
  projects: any[];
  experience: any[];
  education: any[];
  summary?: string;
}

export interface IResume extends Document {
  sessionId: string; // The session this resume was uploaded for
  originalFileName: string;
  extractedText: string;
  structuredData: IResumeData;
  createdAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  sessionId: { type: String, required: true },
  originalFileName: { type: String, required: true },
  extractedText: { type: String, required: true },
  structuredData: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default mongoose.model<IResume>('Resume', ResumeSchema);
