const pdfParse = require('pdf-parse');
import Groq from 'groq-sdk';
import { IResumeData } from '../models/Resume';
import { env } from '../config/env';

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractResumeData(text: string): Promise<IResumeData> {
  const prompt = `
Extract the following information from the given resume text and format it strictly as a JSON object with this exact structure:
{
  "skills": ["skill1", "skill2"],
  "projects": [{"name": "Project Name", "description": "Brief description"}],
  "experience": [{"role": "Role", "company": "Company", "duration": "Duration", "description": "Brief description"}],
  "education": [{"degree": "Degree", "institution": "Institution", "year": "Year"}],
  "summary": "Short professional summary"
}

Resume Text:
${text}
`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are an expert resume parser. Respond ONLY with the requested JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(content) as IResumeData;
  } catch (error) {
    console.error("Failed to parse resume JSON", error);
    return { skills: [], projects: [], experience: [], education: [] };
  }
}
