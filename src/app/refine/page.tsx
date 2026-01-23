'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Application, Resume, StructuredResume } from '@/types';

function RefinePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id');

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
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);

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
      loadResume(user.id);
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
      const app = data.applications.find((a: Application) => a.id === appId);
      if (app) {
        setJobDescription(app.jobDescription);
        setTailoredResume(app.tailoredResume);
        setAtsScore(app.atsScore);
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
      // Format: experience-{expIndex}-bullet-{bulletIndex}
      const parts = editingSection.split('-');
      const expIndex = parseInt(parts[1]);
      const bulletIndex = parseInt(parts[3]);
      updatedResume.experience = [...tailoredResume.experience];
      updatedResume.experience[expIndex] = {
        ...updatedResume.experience[expIndex],
        bullets: [...updatedResume.experience[expIndex].bullets]
      };
      updatedResume.experience[expIndex].bullets[bulletIndex] = editText;
    } else if (editingSection.startsWith('education-')) {
      // Format: education-{eduIndex}
      const parts = editingSection.split('-');
      const eduIndex = parseInt(parts[1]);
      updatedResume.education = [...tailoredResume.education];
      updatedResume.education[eduIndex] = {
        ...updatedResume.education[eduIndex],
        details: editText
      };
    }

    setTailoredResume(updatedResume);
    setEditingSection(null);

    // Update in database if needed
    if (currentApplicationId) {
      await fetch(`/api/application/${currentApplicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailored_resume: updatedResume }),
      });
    }
  };

  const handleRewrite = async (instruction: string) => {
    if (!editText || !jobDescription) {
      console.log('Cannot rewrite: missing editText or jobDescription');
      setRewriteError('Missing text or job description');
      return;
    }

    console.log('Starting rewrite with instruction:', instruction);
    setRewriteLoading(true);
    setRewriteError(null);

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

      console.log('Rewrite response status:', response.status);
      const data = await response.json();
      console.log('Rewrite response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to rewrite text';
        console.error('Rewrite failed:', errorMsg);
        setRewriteError(errorMsg);
        return;
      }

      if (data.rewritten) {
        console.log('Rewrite successful, updating text');
        setEditText(data.rewritten);
      } else {
        console.warn('No rewritten text in response');
        setRewriteError('No rewritten text received');
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      setRewriteError('Failed to rewrite text. Please try again.');
    } finally {
      setRewriteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          <h1 className="text-3xl font-bold mb-8">Tailor Your Resume</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Input */}
            <div className="space-y-6">
              {/* Upload Resume */}
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

              {/* Job Description */}
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

              {/* Tailor Button */}
              <Button
                onClick={handleTailorResume}
                disabled={loading || !resume || !jobDescription}
                className="w-full"
                size="lg"
              >
                {loading ? 'Tailoring Resume...' : 'Tailor Resume'}
              </Button>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              {tailoredResume ? (
                <>
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
                      <CardDescription>Click any section to edit</CardDescription>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('summary', tailoredResume.summary!)}
                            >
                              Edit
                            </Button>
                          </div>
                          {editingSection === 'summary' ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveEdit}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRewrite('more impactful')}
                                  disabled={rewriteLoading}
                                >
                                  {rewriteLoading ? 'Rewriting...' : 'AI Rewrite'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingSection(null);
                                    setRewriteError(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                              {rewriteError && (
                                <p className="text-sm text-red-600">{rewriteError}</p>
                              )}
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
                            <ul className="list-none mt-2 space-y-1">
                              {exp.bullets.map((bullet, bulletIdx) => {
                                const sectionId = `experience-${expIdx}-bullet-${bulletIdx}`;
                                return (
                                  <li key={bulletIdx} className="text-sm">
                                    {editingSection === sectionId ? (
                                      <div className="space-y-2 ml-0">
                                        <Textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="min-h-[80px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={handleSaveEdit}>
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRewrite('more impactful')}
                                            disabled={rewriteLoading}
                                          >
                                            {rewriteLoading ? 'Rewriting...' : 'AI Rewrite'}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingSection(null);
                                              setRewriteError(null);
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                        {rewriteError && (
                                          <p className="text-sm text-red-600">{rewriteError}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <span className="flex-shrink-0">•</span>
                                        <span className="flex-1">{bullet}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
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
                              <div key={eduIdx} className="mb-4">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-semibold">{edu.degree}</p>
                                    <p className="text-sm text-gray-600">{edu.school}</p>
                                  </div>
                                  <p className="text-sm text-gray-600">{edu.dates}</p>
                                </div>
                                {edu.details && (
                                  <div className="mt-2">
                                    {editingSection === sectionId ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="min-h-[80px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={handleSaveEdit}>
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRewrite('more impactful')}
                                            disabled={rewriteLoading}
                                          >
                                            {rewriteLoading ? 'Rewriting...' : 'AI Rewrite'}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingSection(null);
                                              setRewriteError(null);
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                        {rewriteError && (
                                          <p className="text-sm text-red-600">{rewriteError}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <p className="text-sm flex-1">{edu.details}</p>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleEdit(sectionId, edu.details || '')}
                                        >
                                          Edit
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                </>
              ) : (
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
