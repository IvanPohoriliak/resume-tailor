import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt, extractResumeSummary } from '@/lib/ai/interview-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('job_description, tailored_resume, job_metadata')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Extract role and company from job_metadata
    const role = application.job_metadata?.role || 'the position';
    const company = application.job_metadata?.company || 'the company';

    // Create compact resume summary to reduce tokens
    const resumeSummary = extractResumeSummary(application.tailored_resume);

    // Fill the prompt template
    const prompt = fillPrompt(INTERVIEW_PROMPTS.GENERATE_QUESTIONS, {
      ROLE: role,
      COMPANY: company,
      JOB_DESCRIPTION: application.job_description,
      RESUME_SUMMARY: resumeSummary,
    });

    // Generate questions using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical recruiter. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
    }

    // Parse AI response
    let questions;
    let parsed;
    try {
      parsed = JSON.parse(responseText);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      
      // Debug log
      console.log('AI Response:', responseText.substring(0, 200));
      console.log('Parsed questions count:', questions.length);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('No questions in response. Parsed:', JSON.stringify(parsed).substring(0, 500));
      return NextResponse.json({ error: 'No questions generated' }, { status: 500 });
    }

    // Create interview session in database
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        application_id: applicationId,
        questions: questions,
        status: 'in_progress',
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json({ error: 'Failed to create interview session' }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.id,
      questions: questions,
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
