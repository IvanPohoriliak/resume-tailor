import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { INTERVIEW_PROMPTS, fillPrompt } from '@/lib/ai/interview-prompts';

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

    const { sessionId, questionIndex, question, questionType, answer } = await request.json();

    if (!sessionId || questionIndex === undefined || !question || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fill the prompt template
    const prompt = fillPrompt(INTERVIEW_PROMPTS.ANALYZE_ANSWER, {
      QUESTION_TYPE: questionType || 'general',
      QUESTION: question,
      ANSWER: answer,
    });

    // Analyze answer using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a senior interview coach. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // More deterministic for scoring
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Failed to analyze answer' }, { status: 500 });
    }

    // Parse AI response
    let feedback;
    try {
      feedback = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    // Validate feedback structure
    if (typeof feedback.score !== 'number' || !feedback.strengths || !feedback.weaknesses) {
      return NextResponse.json({ error: 'Invalid feedback structure' }, { status: 500 });
    }

    // Save response to database
    const { data: response, error: responseError } = await supabase
      .from('interview_responses')
      .insert({
        session_id: sessionId,
        question_index: questionIndex,
        question_text: question,
        question_type: questionType || 'general',
        answer_text: answer,
        score: feedback.score,
        feedback: feedback,
      })
      .select()
      .single();

    if (responseError || !response) {
      console.error('Failed to save response:', responseError);
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }

    return NextResponse.json({
      responseId: response.id,
      score: feedback.score,
      feedback: feedback,
    });

  } catch (error) {
    console.error('Analyze answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
