'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WelcomePage() {
  useEffect(() => {
    // Track extension install
    fetch('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ event: 'extension_installed' })
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Resume Tailor!
          </h1>
          <p className="text-xl text-gray-600">
            You're all set! Start tailoring resumes in one click.
          </p>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How to Use (3 Simple Steps)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload Your Resume</h3>
                <p className="text-gray-600">
                  Go to your dashboard and upload your master resume (DOCX format)
                </p>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="mt-2">
                    Upload Resume →
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 text-purple-600 font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Browse Jobs on LinkedIn</h3>
                <p className="text-gray-600">
                  Visit any job posting on LinkedIn and look for the "Tailor Resume" button
                </p>
                <a href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener">
                  <Button variant="outline" size="sm" className="mt-2">
                    Go to LinkedIn Jobs →
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-green-600 font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Click & Download</h3>
                <p className="text-gray-600">
                  Click "Tailor Resume", wait 10 seconds, download your perfectly tailored resume!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-gray-600">
                Tailor your resume in 30 seconds vs 20 minutes manually
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">ATS Optimized</h3>
              <p className="text-sm text-gray-600">
                Get 80+ ATS scores and pass automated screening
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-gray-600">
                Dashboard shows all applications and interview status
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </Link>
            <a href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener">
              <Button size="lg" variant="outline">
                Browse Jobs on LinkedIn
              </Button>
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Need help?{' '}
            <Link href="/help" className="text-blue-600 hover:underline">
              View documentation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
