'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ExtensionAuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUser(user);
      // User is logged in, send token to extension
      sendTokenToExtension();
    }
    
    setLoading(false);
  };

  const sendTokenToExtension = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // Send token to extension via postMessage
      window.postMessage({
        type: 'RESUME_TAILOR_AUTH',
        token: session.access_token
      }, window.location.origin);

      // Show success message
      setTimeout(() => {
        alert('Successfully connected! You can close this tab and return to the extension.');
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Connected Successfully!</CardTitle>
            <CardDescription>
              You can now close this tab and start using Resume Tailor extension.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-blue-800 mt-2 ml-4 list-decimal space-y-1">
                <li>Go to LinkedIn and open any job posting</li>
                <li>Click the "Tailor Resume" button</li>
                <li>Download your tailored resume</li>
              </ol>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => window.close()} 
                className="flex-1"
              >
                Close Tab
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not logged in - show login/signup options
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <CardTitle className="text-2xl">Connect Resume Tailor Extension</CardTitle>
          <CardDescription>
            Log in to your Resume Tailor account to start tailoring resumes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/login?redirect=/extension-auth">
            <Button className="w-full" size="lg">
              Log In
            </Button>
          </Link>
          
          <Link href="/signup?redirect=/extension-auth">
            <Button variant="outline" className="w-full" size="lg">
              Create Account
            </Button>
          </Link>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Don't have the extension?{' '}
              <a 
                href="https://chrome.google.com/webstore" 
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                Install from Chrome Web Store
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
