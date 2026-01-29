// Editable AI Prompts for Interview Prep
// You can modify these prompts without changing code

export const INTERVIEW_PROMPTS = {
  // Generate 8 interview questions based on job and resume
  GENERATE_QUESTIONS: `You are an expert recruiter for a {{ROLE}} position at {{COMPANY}}.

Job Description:
{{JOB_DESCRIPTION}}

Candidate's Background:
{{RESUME_SUMMARY}}

Generate exactly 8 realistic interview questions that would be asked for this role.

Question Distribution:
- 3 behavioral questions (use STAR method, "Tell me about a time when...")
- 3 technical/role-specific questions (knowledge, approach, frameworks)
- 1 situational question ("What would you do if...")
- 1 culture fit/motivation question

Make questions:
- Specific to this exact role and seniority level
- Relevant to candidate's background
- Realistic (not generic textbook questions)

Return as JSON array:
[
  {
    "type": "behavioral",
    "question": "..."
  },
  ...
]`,

  // Analyze a single answer
  ANALYZE_ANSWER: `You are a senior interview coach evaluating a candidate's answer.

Question Type: {{QUESTION_TYPE}}
Question: "{{QUESTION}}"

Candidate's Answer:
{{ANSWER}}

Evaluate the answer on 3 criteria (score each 0-10):

1. STRUCTURE (0-10):
   - For behavioral: Clear STAR framework (Situation, Task, Action, Result)
   - For technical: Logical explanation, clear reasoning
   - For situational: Structured approach, step-by-step thinking
   - Overall: Clarity and organization

2. RELEVANCE (0-10):
   - Directly answers the question
   - Appropriate depth for role/seniority
   - Shows understanding of what interviewer wants

3. IMPACT (0-10):
   - Demonstrates tangible results
   - Uses specific examples (not vague)
   - Shows business/technical outcomes
   - Quantifiable when possible

Then provide:
- 2-3 specific STRENGTHS (what was done well)
- 2-3 specific WEAKNESSES (what's missing or could be better)
- 2-3 actionable SUGGESTIONS (concrete ways to improve this answer)

Overall Score = average of 3 criteria, converted to 0-100 scale

Return as JSON:
{
  "score": 75,
  "structure_score": 8,
  "relevance_score": 7,
  "impact_score": 8,
  "strengths": ["specific strength 1", "strength 2"],
  "weaknesses": ["specific gap 1", "gap 2"],
  "suggestions": ["actionable tip 1", "tip 2"]
}`,

  // Generate final summary after all 8 questions
  FINAL_SUMMARY: `You are a career coach reviewing a complete mock interview performance.

The candidate answered 8 questions with the following results:

{{ALL_RESPONSES}}

Average Score: {{AVERAGE_SCORE}}/100

Provide an overall assessment:

1. OVERALL ASSESSMENT (2-3 sentences):
   - General performance level
   - Interview readiness
   - One key observation

2. TOP 3 STRENGTHS (patterns across all answers):
   - What the candidate consistently does well
   - Specific skills demonstrated

3. TOP 3 AREAS TO IMPROVE (patterns of weakness):
   - What needs work across multiple answers
   - Common gaps or missing elements

4. ACTION PLAN (3 concrete next steps):
   - Specific things to practice before real interview
   - How to address the weaknesses
   - Resources or exercises to try

Return as JSON:
{
  "assessment": "...",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["area 1", "area 2", "area 3"],
  "actions": ["step 1", "step 2", "step 3"]
}`,
};

// Helper function to replace variables in prompts
export function fillPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

// Helper to extract resume summary (to reduce tokens)
export function extractResumeSummary(resume: any): string {
  const summary = resume.summary || '';
  const topExperiences = (resume.experience || []).slice(0, 3).map((exp: any) => 
    `- ${exp.role} at ${exp.company}: ${exp.bullets.slice(0, 2).join('; ')}`
  ).join('\n');
  const skills = (resume.skills || []).slice(0, 10).join(', ');
  
  return `
Summary: ${summary}

Key Experience:
${topExperiences}

Skills: ${skills}
`.trim();
}
