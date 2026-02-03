import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateATSScore } from '@/lib/utils/ats';

// Helper to extract job metadata from description
async function extractJobMetadata(description: string) {
  const text = description.trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let role = '';
  let company = '';
  let location = 'Remote';

  // Job title keywords
  const titleKeywords = /(?:engineer|developer|manager|designer|analyst|specialist|coordinator|director|lead|architect|consultant|administrator|executive|officer|associate|intern|assistant|scientist|researcher|programmer|accountant|recruiter)/i;

  // Check if first line looks like a job title (short and contains title keyword)
  if (lines[0] && lines[0].length < 120 && titleKeywords.test(lines[0])) {
    // First line might be "Senior Project Manager - Company - Location" format
    const parts = lines[0].split(/\s*[-–|]\s*/);
    if (parts.length >= 1) {
      role = parts[0].trim();
      // Check if any other part might be company name (capitalized, not a location keyword)
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!/^(remote|hybrid|on-?site|in-?office|full-?time|part-?time|contract|permanent|outside|inside|ir35)/i.test(part)) {
          if (!company && /^[A-Z]/.test(part)) {
            company = part;
          }
        }
        if (/remote|hybrid|on-?site/i.test(part)) {
          location = part;
        }
      }
    }
  }

  // If no role found, try other patterns
  if (!role) {
    const rolePatterns = [
      /(?:job\s*title|position|role)\s*[:\-]\s*(.+)/i,
      /(?:we are (?:looking|hiring|seeking) (?:for )?(?:a|an)?\s*)(.+?(?:engineer|developer|manager|designer|analyst|specialist|coordinator|director|lead|architect|consultant|administrator|executive|officer|associate|intern|assistant)[a-z]*)/i,
      /(?:recruiting for (?:a|an)?\s*)(.+?(?:engineer|developer|manager|designer|analyst|specialist|coordinator|director|lead|architect|consultant|administrator|executive|officer|associate|intern|assistant)[a-z]*)/i,
      /(?:seeking (?:a|an)?\s*)(.+?(?:engineer|developer|manager|designer|analyst|specialist|coordinator|director|lead|architect|consultant|administrator|executive|officer|associate|intern|assistant)[a-z]*)/i,
    ];

    for (const pattern of rolePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        role = match[1].trim().replace(/[.,!]$/, '');
        break;
      }
    }
  }

  // Still no role? Check first few lines for job title keywords
  if (!role) {
    for (const line of lines.slice(0, 5)) {
      if (titleKeywords.test(line) && line.length < 100) {
        role = line.replace(/[.,!:]+$/, '').trim();
        break;
      }
    }
  }

  // Try to extract company if not found
  if (!company) {
    const companyPatterns = [
      /(?:company|employer|organization)\s*[:\-]\s*(.+)/i,
      /(?:^|\s)at\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})(?:,|\.|!|\s+we|\s+is|\s+are|\s+you)/,
      /(?:^|\s)join\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})(?:,|\.|!|\s+as|\s+and|\s+to)/i,
      /([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\s+is\s+(?:looking|hiring|seeking|recruiting)/,
      /([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\s+(?:are|is)\s+(?:currently\s+)?(?:looking|hiring|seeking|recruiting)/,
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim().replace(/[.,!]$/, '');
        // Avoid extracting generic words as company
        if (!/^(We|The|Our|This|A|An)$/i.test(extracted) && extracted.length > 1) {
          company = extracted;
          break;
        }
      }
    }
  }

  // Try to extract location
  const locationPatterns = [
    /(?:location|based in|located in)\s*[:\-]\s*(.+)/i,
    /\b(remote|hybrid|on-?site|in-?office)\b/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      location = match[1] ? match[1].trim() : match[0].trim();
      break;
    }
  }

  // Truncate if too long
  if (role.length > 80) role = role.substring(0, 80) + '...';
  if (company.length > 50) company = company.substring(0, 50) + '...';

  return {
    role: role || 'Position',
    company: company || 'Company',
    location: location || 'Remote'
  };
}

// POST: Create new application
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, jobDescription, tailoredResume } = await request.json();

    // Check usage limits
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count && count >= 10) {
      return NextResponse.json(
        { error: 'Free tier limit reached. Upgrade to Pro for unlimited tailoring.' },
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

    // Calculate ATS score with detailed recommendations
    const { score, keywords, recommendations, breakdown, missingKeywords } = calculateATSScore(
      tailoredResume || resume.structured,
      jobDescription
    );

    // Save application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        job_description: jobDescription,
        job_metadata: jobMetadata,
        tailored_resume: tailoredResume || resume.structured,
        ats_score: score,
        keywords: {
          matched: keywords.matched,
          missing: recommendations // Store detailed recommendations instead of simple keywords
        },
        status: 'applied',
      })
      .select()
      .single();

    if (appError) {
      console.error('Database error:', appError);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    // Return application with breakdown (breakdown is computed, not stored)
    return NextResponse.json({
      application,
      breakdown,
      missingKeywords
    });
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
