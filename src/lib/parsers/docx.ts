import mammoth from 'mammoth';
import { StructuredResume } from '@/types';
import { openai, MODEL } from '../openai/client';

export async function parseDocxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseDocxToStructured(buffer: Buffer): Promise<StructuredResume> {
  const text = await parseDocxToText(buffer);
  
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Extract resume into JSON format with this structure:
{
  "contact": {
    "name": "string",
    "email": "string",
    "phone": "string (optional)",
    "linkedin": "string (optional)",
    "location": "string (optional)"
  },
  "summary": "string (optional)",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "dates": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "dates": "string",
      "details": "string (optional)"
    }
  ],
  "skills": ["string"]
}

Be precise and extract all information accurately.`
      },
      {
        role: 'user',
        content: text
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const structured = JSON.parse(response.choices[0].message.content || '{}');
  return structured as StructuredResume;
}
