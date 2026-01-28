'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { StructuredResume } from '@/types';

// Raw type from Supabase (snake_case)
interface ApplicationFromDB {
  id: string;
  user_id: string;
  resume_id: string;
  job_description: string;
  job_metadata: any;
  tailored_resume: StructuredResume;
  ats_score: number;
  keywords: {
    matched: string[];
    missing: string[];
  };
  status: string;
  applied_date?: string;
  created_at: string;
  updated_at: string;
}

interface Resume {
  id: string;
  structured: StructuredResume;
}

function RefinePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id');
  const isViewMode = !!applicationId; // If ID exists, we're viewing existing application

  const [user, setUser] = useState<any>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [tailoredResume, setTailoredResume] = useState<StructuredResume | null>(null);
  const [atsScore, setAtsScore] = useState<number>(0);
  const [keywords, setKeywords] = useState<{ matched: string[]; missing: string[] }>({ matched: [], missing: [] });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);

  useEffect(() => {
    checkUser();
    if (applicationId) {
      loadApplication(applicationId);
    }
  }, [applicationId]);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
    } else {
      setUser(user);
      if (!applicationId) {
        loadResume(user.id);
      }
    }
  };

  const loadResume = async (userId: string) => {
    try {
      const response = await fetch('/api/resume');
      const data = await response.json();
      if (data.resumes && data.resumes.length > 0) {
        setResume(data.resumes[0]);
      }
    } catch (error) {
      console.error('Error loading resume:', error);
    }
  };

  const loadApplication = async (appId: string) => {
    try {
      const response = await fetch('/api/application');
      const data = await response.json();
      const app: ApplicationFromDB = data.applications.find((a: ApplicationFromDB) => a.id === appId);
      if (app) {
        setJobDescription(app.job_description);
        setTailoredResume(app.tailored_resume);
        setAtsScore(app.ats_score);
        setKeywords(app.keywords);
        setCurrentApplicationId(app.id);
      }
    } catch (error) {
      console.error('Error loading application:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.resume) {
        setResume(data.resume);
        alert('Resume uploaded successfully!');
      } else {
        alert('Error uploading resume');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading resume');
    } finally {
      setUploading(false);
    }
  };

  const handleTailorResume = async () => {
    if (!resume || !jobDescription) {
      alert('Please upload a resume and enter job description');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resume.id,
          jobDescription,
        }),
      });

      const data = await response.json();
      if (data.application) {
        setTailoredResume(data.application.tailored_resume);
        setAtsScore(data.application.ats_score);
        setKeywords(data.application.keywords);
        setCurrentApplicationId(data.application.id);
      } else {
        alert(data.error || 'Error tailoring resume');
      }
    } catch (error) {
      console.error('Tailoring error:', error);
      alert('Error tailoring resume');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!currentApplicationId) {
      alert('Please tailor your resume first');
      return;
    }

    try {
      const response = await fetch('/api/document/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: currentApplicationId,
          format,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Error generating document');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating document');
    }
  };

  const handleEdit = (section: string, currentText: string) => {
    setEditingSection(section);
    setEditText(currentText);
  };

  const handleSaveEdit = async () => {
    if (!tailoredResume || !editingSection) return;

    const updatedResume = { ...tailoredResume };

    if (editingSection === 'summary') {
      updatedResume.summary = editText;
    } else if (editingSection.startsWith('experience-')) {
      const match = editingSection.match(/experience-(\d+)-bullet-(\d+)/);
      if (match) {
        const expIdx = parseInt(match[1]);
        const bulletIdx = parseInt(match[2]);
        updatedResume.experience[expIdx].bullets[bulletIdx] = editText;
      }
    } else if (editingSection.startsWith('education-')) {
      const match = editingSection.match(/education-(\d+)/);
      if (match) {
        const eduIdx = parseInt(match[1]);
        updatedResume.education[eduIdx].details = editText;
      }
    } else if (editingSection === 'skills') {
      updatedResume.skills = editText.split('•').map(s => s.trim()).filter(Boolean);
    }

    setTailoredResume(updatedResume);
    setEditingSection(null);

    if (currentApplicationId) {
      await fetch(`/api/application/${currentApplicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailored_resume: updatedResume }),
      });
    }
  };

  const handleRewrite = async (instruction: string) => {
    if (!editText || !jobDescription) return;

    setRewriting(true);
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original: editText,
          instruction,
          jobContext: jobDescription,
        }),
      });

      const data = await response.json();
      if (data.rewritten) {
        setEditText(data.rewritten);
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      alert('Error rewriting text');
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Resume Tailor
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              {isViewMode ? 'View Resume' : 'Tailor Your Resume'}
            </h1>
            {isViewMode && (
              <Link href="/refine">
                <Button>+ Create New</Button>
              </Link>
            )}
          </div>

          <div className={isViewMode ? '' : 'grid lg:grid-cols-2 gap-8'}>
            {/* Left Column - Input (only show if NOT viewing existing) */}
            {!isViewMode && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>1. Upload Master Resume</CardTitle>
                    <CardDescription>Upload your DOCX resume file</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Input
                        type="file"
                        accept=".docx"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                      {resume && (
                        <div className="text-sm text-green-600">
                          ✓ Resume uploaded: {resume.structured?.contact?.name || 'Unnamed'}
                        </div>
                      )}
                      {uploading && <div className="text-sm text-gray-500">Uploading...</div>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>2. Paste Job Description</CardTitle>
                    <CardDescription>Copy and paste the full job description</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Paste job description here..."
                      className="min-h-[300px]"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </CardContent>
                </Card>

                <Button
                  onClick={handleTailorResume}
                  disabled={loading || !resume || !jobDescription}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Tailoring Resume...' : 'Tailor Resume'}
                </Button>
              </div>
            )}

            {/* Right Column - Preview (always show if we have tailored resume) */}
            {tailoredResume && (
              <div className={`space-y-6 ${isViewMode ? 'max-w-4xl mx-auto' : ''}`}>
                {/* ATS Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>ATS Score</span>
                      <span className={`text-2xl ${atsScore >= 80 ? 'text-green-600' : atsScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {atsScore}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {keywords.missing.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium mb-1">Missing keywords:</p>
                        <p className="text-gray-600">{keywords.missing.slice(0, 10).join(', ')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preview & Edit</CardTitle>
                    <CardDescription>Click Edit on any section to modify</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact */}
                    <div className="text-center border-b pb-4">
                      <h2 className="text-2xl font-bold">{tailoredResume.contact.name}</h2>
                      <p className="text-sm text-gray-600">
                        {[
                          tailoredResume.contact.email,
                          tailoredResume.contact.phone,
                          tailoredResume.contact.linkedin
                        ].filter(Boolean).join(' | ')}
                      </p>
                    </div>

                    {/* Summary */}
                    {tailoredResume.summary && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">PROFESSIONAL SUMMARY</h3>
                          {editingSection !== 'summary' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('summary', tailoredResume.summary!)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        {editingSection === 'summary' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" onClick={handleSaveEdit}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRewrite('more impactful')}
                                disabled={rewriting}
                              >
                                {rewriting ? 'Rewriting...' : '✨ More Impactful'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRewrite('more technical')}
                                disabled={rewriting}
                              >
                                {rewriting ? 'Rewriting...' : '🔧 More Technical'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRewrite('more concise')}
                                disabled={rewriting}
                              >
                                {rewriting ? 'Rewriting...' : '✂️ More Concise'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSection(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{tailoredResume.summary}</p>
                        )}
                      </div>
                    )}

                    {/* Experience */}
                    <div>
                      <h3 className="font-bold mb-3">EXPERIENCE</h3>
                      {tailoredResume.experience.map((exp, expIdx) => (
                        <div key={expIdx} className="mb-4">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold">{exp.role}</p>
                              <p className="text-sm text-gray-600">{exp.company}</p>
                            </div>
                            <p className="text-sm text-gray-600">{exp.dates}</p>
                          </div>
                          <ul className="list-disc list-inside mt-2 space-y-2">
                            {exp.bullets.map((bullet, bulletIdx) => {
                              const sectionId = `experience-${expIdx}-bullet-${bulletIdx}`;
                              return (
                                <li key={bulletIdx} className="text-sm">
                                  {editingSection === sectionId ? (
                                    <div className="space-y-2 ml-[-20px]">
                                      <Textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="min-h-[60px]"
                                      />
                                      <div className="flex gap-2 flex-wrap">
                                        <Button size="sm" onClick={handleSaveEdit}>
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRewrite('more impactful')}
                                          disabled={rewriting}
                                        >
                                          {rewriting ? 'Rewriting...' : '✨ More Impactful'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRewrite('more quantifiable')}
                                          disabled={rewriting}
                                        >
                                          {rewriting ? 'Rewriting...' : '📊 More Quantifiable'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingSection(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-start group">
                                      <span>{bullet}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                        onClick={() => handleEdit(sectionId, bullet)}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Education */}
                    {tailoredResume.education && tailoredResume.education.length > 0 && (
                      <div>
                        <h3 className="font-bold mb-3">EDUCATION</h3>
                        {tailoredResume.education.map((edu, eduIdx) => {
                          const sectionId = `education-${eduIdx}`;
                          return (
                            <div key={eduIdx} className="mb-3">
                              {editingSection === sectionId ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="min-h-[80px]"
                                    placeholder="Edit education details..."
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveEdit}>
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingSection(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="group">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{edu.degree} | {edu.school}</p>
                                      <p className="text-sm text-gray-600">{edu.dates}</p>
                                      {edu.details && <p className="text-sm mt-1">{edu.details}</p>}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleEdit(sectionId, edu.details || `${edu.degree} at ${edu.school}`)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Skills */}
                    {tailoredResume.skills && tailoredResume.skills.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">SKILLS</h3>
                          {editingSection !== 'skills' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('skills', tailoredResume.skills.join(' • '))}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        {editingSection === 'skills' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[80px]"
                              placeholder="Separate skills with • (bullet)"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSection(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{tailoredResume.skills.join(' • ')}</p>
                        )}
                      </div>
                    )}

                    {/* Download Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button onClick={() => handleDownload('docx')} className="flex-1">
                        Download DOCX
                      </Button>
                      <Button onClick={() => handleDownload('pdf')} variant="outline" className="flex-1">
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty state when no tailored resume yet (only in create mode) */}
            {!isViewMode && !tailoredResume && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Upload your resume and paste a job description to get started
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ type, accept, onChange, disabled, className }: any) {
  return (
    <input
      type={type}
      accept={accept}
      onChange={onChange}
      disabled={disabled}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
    />
  );
}

export default function RefinePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RefinePageContent />
    </Suspense>
  );
}
