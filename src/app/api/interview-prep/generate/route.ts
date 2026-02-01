import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt, extractResumeSummary } from '@/lib/ai/interview-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json();

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*, resumes(*)')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Заявку не знайдено' }, { status: 404 });
    }

    const jobMetadata = application.job_metadata || {};
    const jobTitle = jobMetadata.role || 'цю позицію';
    const company = jobMetadata.company || 'компанію';
    const jobDescription = application.job_description || '';

    const resume = application.resumes?.structured || application.tailored_resume || {};
    const resumeSummary = extractResumeSummary(resume);

    const prompt = fillPrompt(INTERVIEW_PROMPTS.GENERATE_QUESTIONS, {
      ROLE: jobTitle,
      COMPANY: company,
      JOB_DESCRIPTION: jobDescription.substring(0, 2000),
      RESUME_SUMMARY: resumeSummary,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ти експерт-рекрутер. Завжди повертай валідний JSON.'
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
      return NextResponse.json({ error: 'Не вдалося згенерувати питання' }, { status: 500 });
    }

    const aiResponse = JSON.parse(responseText);
    const questions = aiResponse.questions || [];

    // Create session with questions in JSONB
    const { data: session, error: saveError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        application_id: applicationId,
        questions: questions,
        status: 'in_progress',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error creating session:', saveError);
      return NextResponse.json({ error: 'Не вдалося створити сесію' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      questions: questions,
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
