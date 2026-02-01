import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt } from '@/lib/ai/interview-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сесію не знайдено' }, { status: 404 });
    }

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_index');

    if (responsesError || !responses || responses.length === 0) {
      return NextResponse.json({ 
        error: 'Немає відповідей для аналізу. Спочатку дайте відповіді на питання.'
      }, { status: 404 });
    }

    const questions = session.questions || [];

    // Check if all questions are answered
    if (responses.length < questions.length) {
      return NextResponse.json({ 
        error: `Відповіли тільки на ${responses.length} з ${questions.length} питань. Завершіть всі питання для отримання підсумку.`
      }, { status: 400 });
    }

    // Calculate average score
    const totalScore = responses.reduce((sum, r) => sum + (r.score || 0), 0);
    const avgScore = Math.round(totalScore / responses.length);

    // Format all responses for AI
    const formattedResponses = responses.map((r, index) => {
      return `
Питання ${index + 1} (${r.question_type}):
${r.question_text}

Відповідь:
${r.answer_text}

Оцінка: ${r.score}/100

Сильні сторони: ${r.feedback?.strengths?.join('; ') || 'N/A'}
Слабкі сторони: ${r.feedback?.weaknesses?.join('; ') || 'N/A'}
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

    // Update session with overall score and feedback
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        overall_score: avgScore,
        feedback: {
          assessment: summary.assessment,
          strengths: summary.strengths,
          weaknesses: summary.weaknesses,
          actions: summary.actions,
        },
        status: 'completed',
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json({ error: 'Не вдалося оновити сесію' }, { status: 500 });
    }

    // Return camelCase for frontend
    return NextResponse.json({
      success: true,
      overallScore: avgScore,  // camelCase ✅
      feedback: {
        assessment: summary.assessment,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        actions: summary.actions,
      },
    });

  } catch (error) {
    console.error('Complete interview error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
