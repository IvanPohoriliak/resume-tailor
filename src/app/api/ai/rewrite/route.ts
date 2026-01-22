import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rewriteSection } from '@/lib/ai/tailoring';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { original, instruction, jobContext } = await request.json();

    if (!original || !instruction) {
      return NextResponse.json(
        { error: 'Original text and instruction are required' },
        { status: 400 }
      );
    }

    const rewritten = await rewriteSection(original, instruction, jobContext || '');

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error('Rewrite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
