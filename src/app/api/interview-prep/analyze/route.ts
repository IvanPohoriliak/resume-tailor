import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt } from '@/lib/ai/interview-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, questionIndex, answer } = await request.json();

    if (!answer || answer.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Відповідь занадто коротка. Надайте більш детальну відповідь.' 
      }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session with questions
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сесію не знайдено' }, { status: 404 });
    }

    const questions = session.questions || [];
    const question = questions[questionIndex];

    if (!question) {
      return NextResponse.json({ error: 'Питання не знайдено' }, { status: 404 });
    }

    // Fill prompt with data
    const prompt = fillPrompt(INTERVIEW_PROMPTS.ANALYZE_ANSWER, {
      QUESTION_TYPE: question.type,
      QUESTION: question.question,
      ANSWER: answer,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ти досвідчений коуч по співбесідам. Завжди повертай валідний JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Не вдалося проаналізувати відповідь' }, { status: 500 });
    }

    const feedback = JSON.parse(responseText);

    // Validate feedback structure
    if (!feedback.score || !feedback.strengths || !feedback.weaknesses || !feedback.suggestions) {
      return NextResponse.json({ error: 'Невалідна відповідь від AI' }, { status: 500 });
    }

    // Save response
    const { data: savedResponse, error: saveError } = await supabase
      .from('interview_responses')
      .insert({
        session_id: sessionId,
        question_index: questionIndex,
        question_text: question.question,
        question_type: question.type,
        answer_text: answer,
        score: feedback.score,
        feedback: {
          structure_score: feedback.structure_score,
          relevance_score: feedback.relevance_score,
          impact_score: feedback.impact_score,
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving response:', saveError);
      return NextResponse.json({ error: 'Не вдалося зберегти відповідь' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      response: savedResponse,
      feedback: {
        score: feedback.score,
        structure_score: feedback.structure_score,
        relevance_score: feedback.relevance_score,
        impact_score: feedback.impact_score,
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        suggestions: feedback.suggestions,
      },
    });

  } catch (error) {
    console.error('Analyze answer error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
