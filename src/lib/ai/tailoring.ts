import { openai, MODEL } from '../openai/client';
import { StructuredResume, JobMetadata } from '@/types';

export async function extractJobMetadata(jobDescription: string): Promise<JobMetadata> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Extract company name, role/position, and location from the job description.
Return JSON: { "company": "string or null", "role": "string or null", "location": "string or null" }`
      },
      {
        role: 'user',
        content: jobDescription
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function tailorResume(
  masterResume: StructuredResume,
  jobDescription: string
): Promise<StructuredResume> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert resume writer specializing in ATS optimization.

Tailor the provided resume for the given job description while following these rules:
1. Keep all information TRUTHFUL - never fabricate experience or skills
2. Optimize keyword usage from the job description
3. Reframe bullets to emphasize relevant experience
4. Maintain professional tone and clarity
5. Keep the same structure and format
6. Focus on quantifiable achievements where possible

Return the tailored resume in the same JSON structure as the input.`
      },
      {
        role: 'user',
        content: `Master Resume:\n${JSON.stringify(masterResume, null, 2)}\n\nJob Description:\n${jobDescription}\n\nTailor this resume for maximum ATS compatibility while keeping all information truthful.`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function rewriteSection(
  originalText: string,
  instruction: string,
  jobContext: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Rewrite the given resume section to be ${instruction}.
Keep it truthful, professional, and ATS-friendly.
Consider the job context for relevance.
Return only the rewritten text, no additional commentary.`
      },
      {
        role: 'user',
        content: `Original text: ${originalText}\n\nJob context: ${jobContext}\n\nRewrite this to be ${instruction}.`
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || originalText;
}
