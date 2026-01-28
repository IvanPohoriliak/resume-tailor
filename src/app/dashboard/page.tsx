'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface ApplicationFromDB {
  id: string;
  user_id: string;
  resume_id: string;
  job_description: string;
  job_metadata: {
    role?: string;
    company?: string;
    location?: string;
  };
  tailored_resume: any;
  ats_score: number;
  keywords: {
    matched: string[];
    missing: string[];
  };
  status: 'applied' | 'screening' | 'interview' | 'rejected' | 'offer';
  applied_date?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchApplications();
  }, []);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
    } else {
      setUser(user);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/application');
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'screening':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'interview':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'offer':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const stats = {
    applied: applications.filter(a => a.status === 'applied').length,
    screening: applications.filter(a => a.status === 'screening').length,
    interview: applications.filter(a => a.status === 'interview').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Resume Tailor
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Applied</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.applied}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Screening</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.screening}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Interview</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.interview}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Section */}
        <div className="bg-white rounded-xl shadow-sm border-0">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Applications</h2>
                <p className="text-sm text-gray-500 mt-1">Track and manage your job applications</p>
              </div>
              <Link href="/refine">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Application
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-6">
            {applications.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-500 mb-6">Start by creating your first tailored resume</p>
                <Link href="/refine">
                  <Button>Create Your First Application</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Job Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg ${getScoreBgColor(app.ats_score)} flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-sm font-bold ${getScoreColor(app.ats_score)}`}>
                              {app.ats_score}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">
                              {app.job_metadata?.role || 'Position'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="truncate">{app.job_metadata?.company || 'Company'}</span>
                              {app.job_metadata?.location && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{app.job_metadata.location}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                                {app.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href={`/refine?id=${app.id}`}>
                          <Button size="sm" variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-gray-900"
                          onClick={async () => {
                            const newStatus = prompt('Enter new status (applied/screening/interview/rejected/offer):', app.status);
                            if (newStatus && ['applied', 'screening', 'interview', 'rejected', 'offer'].includes(newStatus)) {
                              await fetch(`/api/application/${app.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              fetchApplications();
                            }
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
