import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify extension request
    const extVersion = request.headers.get('X-Extension-Version');
    if (!extVersion) {
      return NextResponse.json({ error: 'Invalid request source' }, { status: 403 });
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's resumes
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('id, created_at, structured')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resumes:', error);
      return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 });
    }

    // Format resumes for extension
    const formattedResumes = (resumes || []).map(resume => ({
      id: resume.id,
      name: resume.structured?.contact?.name || 'Unnamed Resume',
      createdAt: resume.created_at
    }));

    return NextResponse.json({ resumes: formattedResumes });

  } catch (error) {
    console.error('Get resumes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
