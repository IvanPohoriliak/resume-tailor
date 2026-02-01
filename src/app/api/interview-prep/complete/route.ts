import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt } from '@/lib/ai/interview-prompts';

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

    // Get all questions for this application
    const { data: questions, error: questionsError } = await supabase
      .from('interview_questions')
      .select('id, question_text, question_type')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
      .order('question_number');

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Питання не знайдено' }, { status: 404 });
    }

    // Get all answers with feedback
    const { data: answers, error: answersError } = await supabase
      .from('interview_answers')
      .select('question_id, answer_text, score, feedback')
      .in('question_id', questions.map(q => q.id))
      .eq('user_id', user.id);

    if (answersError || !answers || answers.length === 0) {
      return NextResponse.json({ 
        error: 'Немає відповідей для аналізу. Спочатку дайте відповіді на питання.'
      }, { status: 404 });
    }

    // Check if all questions are answered
    if (answers.length < questions.length) {
      return NextResponse.json({ 
        error: `Відповіли тільки на ${answers.length} з ${questions.length} питань. Завершіть всі питання для отримання підсумку.`
      }, { status: 400 });
    }

    // Calculate average score
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const avgScore = Math.round(totalScore / answers.length);

    // Format all responses for AI
    const formattedResponses = questions.map((q, index) => {
      const answer = answers.find(a => a.question_id === q.id);
      return `
Питання ${index + 1} (${q.question_type}):
${q.question_text}

Відповідь:
${answer?.answer_text || 'N/A'}

Оцінка: ${answer?.score || 0}/100

Сильні сторони: ${answer?.feedback?.strengths?.join('; ') || 'N/A'}
Слабкі сторони: ${answer?.feedback?.weaknesses?.join('; ') || 'N/A'}
`;
    }).join('\n---\n');

    // Fill prompt with data
    const prompt = fillPrompt(INTERVIEW_PROMPTS.FINAL_SUMMARY, {
      ALL_RESPONSES: formattedResponses,
      AVERAGE_SCORE: avgScore.toString(),
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ти кар\'єрний коуч, який аналізує співбесіди. Завжди повертай валідний JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Не вдалося згенерувати підсумок' }, { status: 500 });
    }

    const summary = JSON.parse(responseText);

    // Validate summary structure
    if (!summary.assessment || !summary.strengths || !summary.weaknesses || !summary.actions) {
      return NextResponse.json({ error: 'Невалідна відповідь від AI' }, { status: 500 });
    }

    // Save summary
    const { data: savedSummary, error: saveError } = await supabase
      .from('interview_summaries')
      .insert({
        application_id: applicationId,
        user_id: user.id,
        average_score: avgScore,
        total_questions: questions.length,
        assessment: summary.assessment,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        action_plan: summary.actions,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      return NextResponse.json({ error: 'Не вдалося зберегти підсумок' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: {
        average_score: avgScore,
        total_questions: questions.length,
        assessment: summary.assessment,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        actions: summary.actions,
      },
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
