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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_index');

    if (responsesError || !responses || responses.length === 0) {
      return NextResponse.json({ error: 'No responses found' }, { status: 404 });
    }

    // Calculate average score
    const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
    const averageScore = Math.round(totalScore / responses.length);

    // Format responses for AI prompt
    const responseSummary = responses.map((r, idx) => 
      `Q${idx + 1} (${r.question_type}): Score ${r.score}/100
Strengths: ${r.feedback.strengths?.join(', ') || 'N/A'}
Weaknesses: ${r.feedback.weaknesses?.join(', ') || 'N/A'}`
    ).join('\n\n');

    // Fill the prompt template
    const prompt = fillPrompt(INTERVIEW_PROMPTS.FINAL_SUMMARY, {
      ALL_RESPONSES: responseSummary,
      AVERAGE_SCORE: averageScore.toString(),
    });

    // Generate final summary using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a career coach providing constructive interview feedback. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }

    // Parse AI response
    let finalFeedback;
    try {
      finalFeedback = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    // Update session with final results
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        status: 'completed',
        overall_score: averageScore,
        feedback: finalFeedback,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
    }

    return NextResponse.json({
      overallScore: averageScore,
      feedback: finalFeedback,
    });

  } catch (error) {
    console.error('Complete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
