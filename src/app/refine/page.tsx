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
    missing: string[] | string; // Can be array of recommendations or simple keywords
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
  const isViewMode = !!applicationId;

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
        
        // Handle both old format (simple keywords) and new format (recommendations)
        const missingData = app.keywords?.missing || [];
        setKeywords({
          matched: app.keywords?.matched || [],
          missing: Array.isArray(missingData) ? missingData : [missingData]
        });
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

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setResume(data.resume);
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleTailorResume = async () => {
    if (!resume || !jobDescription) return;

    setLoading(true);
    try {
      const response = await fetch('/api/tailor', {
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
        
        // Handle both formats
        const missingData = data.application.keywords?.missing || [];
        setKeywords({
          matched: data.application.keywords?.matched || [],
          missing: Array.isArray(missingData) ? missingData : [missingData]
        });
        setCurrentApplicationId(data.application.id);
      }
    } catch (error) {
      console.error('Error tailoring resume:', error);
      alert('Failed to tailor resume');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: string, currentContent: string) => {
    setEditingSection(section);
    setEditText(currentContent);
  };

  const handleSaveEdit = async () => {
    if (!editingSection || !tailoredResume || !currentApplicationId) return;

    const updatedResume = { ...tailoredResume };
    
    if (editingSection === 'summary') {
      updatedResume.summary = editText;
    } else if (editingSection.startsWith('exp-')) {
      const expIndex = parseInt(editingSection.split('-')[1]);
      updatedResume.experience[expIndex].bullets = editText.split('\n').filter(b => b.trim());
    } else if (editingSection === 'skills') {
      updatedResume.skills = editText.split('\n').filter(s => s.trim());
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('applications')
        .update({ tailored_resume: updatedResume })
        .eq('id', currentApplicationId);

      if (error) throw error;

      setTailoredResume(updatedResume);
      setEditingSection(null);
      setEditText('');
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Failed to save changes');
    }
  };

  const handleAIRewrite = async () => {
    if (!editingSection || !editText || !jobDescription) return;

    setRewriting(true);
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editText,
          jobDescription,
          section: editingSection,
        }),
      });

      const data = await response.json();
      if (data.rewrittenContent) {
        setEditText(data.rewrittenContent);
      }
    } catch (error) {
      console.error('Error rewriting:', error);
      alert('Failed to rewrite content');
    } finally {
      setRewriting(false);
    }
  };

  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!currentApplicationId) return;

    try {
      const response = await fetch(
        `/api/document/generate?applicationId=${currentApplicationId}&format=${format}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download resume');
    }
  };

  // Helper to format skills (handle different data types)
  const formatSkills = (skills: any): string => {
    if (Array.isArray(skills)) return skills.join(', ');
    if (typeof skills === 'object' && skills !== null) {
      return Object.values(skills).flat().join(', ');
    }
    if (typeof skills === 'string') return skills;
    return '';
  };

  // Check if missing data is recommendations (new format) or simple keywords (old format)
  const isRecommendationsFormat = (missing: string[]): boolean => {
    if (missing.length === 0) return false;
    // Recommendations typically start with category labels like "Hard Skills:", "Experience:", etc.
    return missing.some(item => 
      item.includes('Hard Skills:') || 
      item.includes('Soft Skills:') || 
      item.includes('Tools:') ||
      item.includes('Experience:') ||
      item.includes('Summary:') ||
      item.includes('Education:') ||
      item.includes('Formatting:') ||
      item.includes('Certifications:')
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
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
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="w-full"
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
                    <div className="text-sm space-y-2">
                      {isRecommendationsFormat(keywords.missing) ? (
                        // New format: Detailed categorized recommendations
                        <>
                          <p className="font-medium mb-2">Recommendations:</p>
                          <div className="space-y-1">
                            {keywords.missing.map((recommendation, idx) => (
                              <p key={idx} className="text-gray-700 leading-relaxed">
                                {recommendation}
                              </p>
                            ))}
                          </div>
                        </>
                      ) : (
                        // Old format: Simple missing keywords
                        <>
                          <p className="font-medium mb-1">Missing keywords:</p>
                          <p className="text-gray-600">{keywords.missing.slice(0, 10).join(', ')}</p>
                        </>
                      )}
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
                        {editingSection !== 'summary' && !isViewMode && (
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
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={handleAIRewrite}
                              disabled={rewriting}
                            >
                              {rewriting ? 'Rewriting...' : 'AI Rewrite'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">{tailoredResume.summary}</p>
                      )}
                    </div>
                  )}

                  {/* Experience */}
                  <div>
                    <h3 className="font-bold mb-3">EXPERIENCE</h3>
                    <div className="space-y-4">
                      {tailoredResume.experience.map((exp, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-semibold">{exp.role}</p>
                              <p className="text-sm text-gray-600">{exp.company} • {exp.dates}</p>
                            </div>
                            {editingSection !== `exp-${idx}` && !isViewMode && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(`exp-${idx}`, exp.bullets.join('\n'))}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          {editingSection === `exp-${idx}` ? (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[150px]"
                                placeholder="One bullet point per line"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  onClick={handleAIRewrite}
                                  disabled={rewriting}
                                >
                                  {rewriting ? 'Rewriting...' : 'AI Rewrite'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {exp.bullets.map((bullet, bidx) => (
                                <li key={bidx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  {tailoredResume.education.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-2">EDUCATION</h3>
                      {tailoredResume.education.map((edu, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-semibold">{edu.degree}</p>
                          <p className="text-gray-600">{edu.school} • {edu.dates}</p>
                          {edu.details && <p className="text-gray-700">{edu.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {tailoredResume.skills && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold">SKILLS</h3>
                        {editingSection !== 'skills' && !isViewMode && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit('skills', formatSkills(tailoredResume.skills))}
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
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">{formatSkills(tailoredResume.skills)}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Download Buttons */}
              {currentApplicationId && (
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleDownload('docx')}
                    className="flex-1"
                  >
                    Download DOCX
                  </Button>
                  <Button
                    onClick={() => handleDownload('pdf')}
                    variant="outline"
                    className="flex-1"
                  >
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RefinePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RefinePageContent />
    </Suspense>
  );
}
