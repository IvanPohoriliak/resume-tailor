import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocx } from '@/lib/generators/docx';
import { generatePdf } from '@/lib/generators/pdf';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, format } = await request.json();

    if (!applicationId || !format) {
      return NextResponse.json(
        { error: 'Application ID and format are required' },
        { status: 400 }
      );
    }

    if (!['docx', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be either "docx" or "pdf"' },
        { status: 400 }
      );
    }

    // Fetch application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate document
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === 'docx') {
      buffer = await generateDocx(application.tailored_resume);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `resume_${Date.now()}.docx`;
    } else {
      buffer = await generatePdf(application.tailored_resume);
      contentType = 'application/pdf';
      filename = `resume_${Date.now()}.pdf`;
    }

    // Upload to Supabase Storage
    const filePath = `${user.id}/generated/${filename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Get signed URL for private bucket (expires in 1 hour)
    const { data: { signedUrl }, error: urlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      console.error('URL error:', urlError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({ 
      url: signedUrl,
      filename 
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
