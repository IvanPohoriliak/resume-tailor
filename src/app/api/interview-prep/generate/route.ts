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

    // Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get application data
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*, resumes(*)')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Заявку не знайдено' }, { status: 404 });
    }

    // Extract job data
    const jobMetadata = application.job_metadata || {};
    const jobTitle = jobMetadata.role || 'цю позицію';
    const company = jobMetadata.company || 'компанію';
    const jobDescription = application.job_description || '';

    // Get resume
    const resume = application.resumes?.structured || application.tailored_resume || {};
    const resumeSummary = extractResumeSummary(resume);

    // Fill prompt with data
    const prompt = fillPrompt(INTERVIEW_PROMPTS.GENERATE_QUESTIONS, {
      ROLE: jobTitle,
      COMPANY: company,
      JOB_DESCRIPTION: jobDescription.substring(0, 2000),
      RESUME_SUMMARY: resumeSummary,
    });

    // Call OpenAI
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

    // Save questions to database
    const questionsToSave = questions.map((q: any, index: number) => ({
      application_id: applicationId,
      user_id: user.id,
      question_number: index + 1,
      question_type: q.type || 'general',
      question_text: q.question,
    }));

    const { data: savedQuestions, error: saveError } = await supabase
      .from('interview_questions')
      .insert(questionsToSave)
      .select();

    if (saveError) {
      console.error('Error saving questions:', saveError);
      return NextResponse.json({ error: 'Не вдалося зберегти питання' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions: savedQuestions,
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
