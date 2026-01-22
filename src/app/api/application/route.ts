import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tailorResume, extractJobMetadata } from '@/lib/ai/tailoring';
import { calculateATSScore } from '@/lib/utils/ats';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, jobDescription } = await request.json();

    if (!resumeId || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume ID and job description are required' },
        { status: 400 }
      );
    }

    // Check usage limits (free tier: 5 per month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    // Get user subscription
    const { data: userData } = await supabase
      .from('users')
      .select('subscription')
      .eq('id', user.id)
      .single();

    const subscription = userData?.subscription || 'free';
    
    if (subscription === 'free' && (count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Monthly limit reached. Upgrade to Pro for unlimited tailoring.' },
        { status: 403 }
      );
    }

    // Fetch master resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Extract job metadata
    const jobMetadata = await extractJobMetadata(jobDescription);

    // Tailor resume
    const tailoredResume = await tailorResume(resume.structured, jobDescription);

    // Calculate ATS score
    const { score, keywords } = calculateATSScore(tailoredResume, jobDescription);

    // Save application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        job_description: jobDescription,
        job_metadata: jobMetadata,
        tailored_resume: tailoredResume,
        ats_score: score,
        keywords: keywords,
        status: 'applied',
      })
      .select()
      .single();

    if (appError) {
      console.error('Database error:', appError);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Application creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: applications, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
