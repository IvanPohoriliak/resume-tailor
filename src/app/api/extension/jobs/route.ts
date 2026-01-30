import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get user's applications (for popup display)
export async function GET(request: NextRequest) {
  try {
    const extVersion = request.headers.get('X-Extension-Version');
    if (!extVersion) {
      return NextResponse.json({ error: 'Invalid request source' }, { status: 403 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent applications
    const { data: applications, error } = await supabase
      .from('applications')
      .select('id, job_metadata, ats_score, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ jobs: applications || [] });

  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save job for later (without tailoring)
export async function POST(request: NextRequest) {
  try {
    const extVersion = request.headers.get('X-Extension-Version');
    if (!extVersion) {
      return NextResponse.json({ error: 'Invalid request source' }, { status: 403 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobData } = await request.json();

    if (!jobData || !jobData.title) {
      return NextResponse.json({ error: 'Invalid job data' }, { status: 400 });
    }

    // Save as a draft application (no tailored resume yet)
    const { data: application, error: saveError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        resume_id: null, // Will be set when user tailors
        job_description: jobData.description || '',
        job_metadata: {
          role: jobData.title,
          company: jobData.company,
          location: jobData.location,
          url: jobData.url,
          source: jobData.source || 'extension'
        },
        tailored_resume: null,
        ats_score: 0,
        keywords: { matched: [], missing: [] },
        status: 'saved'
      })
      .select()
      .single();

    if (saveError || !application) {
      console.error('Error saving job:', saveError);
      return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      jobId: application.id 
    });

  } catch (error) {
    console.error('Save job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
