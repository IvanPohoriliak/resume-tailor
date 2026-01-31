import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt, extractResumeSummary } from '@/lib/ai/interview-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting tracker (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, maxRequests: number = 100): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const existing = rateLimitMap.get(userId);
  
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + hourInMs });
    return true;
  }
  
  if (existing.count >= maxRequests) {
    return false;
  }
  
  existing.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify extension version
    const extVersion = request.headers.get('X-Extension-Version');
    if (!extVersion) {
      return NextResponse.json({ error: 'Invalid request source' }, { status: 403 });
    }

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Maximum 100 requests per hour.' 
      }, { status: 429 });
    }

    // Get request body
    const { jobData, resumeId } = await request.json();

    // Validate job data
    if (!jobData || !jobData.title || !jobData.description) {
      return NextResponse.json({ 
        error: 'Invalid job data. Title and description are required.' 
      }, { status: 400 });
    }

    // Get user's resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json({ 
        error: 'No resume found. Please upload a resume first.' 
      }, { status: 404 });
    }

    // Generate tailored resume using AI
    const resumeSummary = extractResumeSummary(resume.structured);
    
    const prompt = `You are an expert resume writer. Tailor this resume for the job posting.

Original Resume Summary:
${resumeSummary}

Job Posting:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.description.substring(0, 2000)}

Instructions:
1. Modify the professional summary to match the job requirements
2. Adjust experience bullets to highlight relevant skills
3. Prioritize keywords from the job description
4. Keep the same structure and format
5. Return the tailored resume in the same JSON structure

Return JSON with: { tailored_resume: {...}, matched_keywords: [], missing_keywords: [] }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Failed to generate tailored resume' }, { status: 500 });
    }

    const aiResponse = JSON.parse(responseText);
    
    // Merge AI response with original resume to preserve all fields (contact, education, etc.)
    const tailoredResume = aiResponse.tailored_resume 
      ? { ...resume.structured, ...aiResponse.tailored_resume }
      : resume.structured;
    
    const matchedKeywords = aiResponse.matched_keywords || [];
    const missingKeywords = aiResponse.missing_keywords || [];

    // Calculate ATS score (simple formula based on keyword matching)
    const totalKeywords = matchedKeywords.length + missingKeywords.length;
    const atsScore = totalKeywords > 0 
      ? Math.round((matchedKeywords.length / totalKeywords) * 100)
      : 75; // Default score

    // Save application to database
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        resume_id: resume.id,
        job_description: jobData.description,
        job_metadata: {
          role: jobData.title,
          company: jobData.company,
          location: jobData.location,
          url: jobData.url,
          source: jobData.source || 'extension'
        },
        structured: tailoredResume,
        ats_score: atsScore,
        keywords: {
          matched: matchedKeywords,
          missing: missingKeywords
        },
        status: 'applied'
      })
      .select()
      .single();

    if (appError || !application) {
      console.error('Error saving application:', appError);
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 });
    }

    // Generate download URL (using existing document generation)
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://resume-tailor-dun.vercel.app'}/api/document/generate?applicationId=${application.id}&format=docx`;

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      atsScore: atsScore,
      downloadUrl: downloadUrl,
      missingKeywords: missingKeywords.slice(0, 5) // Top 5 missing keywords
    });

  } catch (error) {
    console.error('Extension tailor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
