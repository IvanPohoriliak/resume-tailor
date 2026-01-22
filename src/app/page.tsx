import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">Resume Tailor</div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          Tailor Your Resume for Any Job
          <br />
          <span className="text-blue-600">In Minutes, Not Hours</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          AI-powered resume optimization that gets you past ATS systems and lands more interviews.
          Upload once, tailor unlimited times.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Tailoring for Free
          </Button>
        </Link>
        <p className="text-sm text-gray-500 mt-4">
          5 free tailored resumes per month. No credit card required.
        </p>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">The Job Search Problem</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Without Resume Tailor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>⏱️ 30 minutes per application</p>
                <p>😫 Manual copy-paste hell</p>
                <p>❌ Low ATS pass rate</p>
                <p>📉 2-3 applications per evening</p>
                <p>🤷 No idea if resume will pass ATS</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">With Resume Tailor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>⚡ 2 minutes per application</p>
                <p>🤖 AI does the heavy lifting</p>
                <p>✅ Optimized for ATS</p>
                <p>🚀 10-20 applications per evening</p>
                <p>📊 See your ATS score instantly</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">
                1
              </div>
              <h3 className="font-bold mb-2">Upload Master Resume</h3>
              <p className="text-gray-600">Upload your DOCX resume once. We'll parse and structure it.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">
                2
              </div>
              <h3 className="font-bold mb-2">Paste Job Description</h3>
              <p className="text-gray-600">Copy job description from any job board and paste it in.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">
                3
              </div>
              <h3 className="font-bold mb-2">Download Tailored Resume</h3>
              <p className="text-gray-600">Get ATS-optimized resume in DOCX or PDF. Edit inline if needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>ATS Score</CardTitle>
              <CardDescription>See how well your resume matches the job</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inline Editing</CardTitle>
              <CardDescription>Edit any section directly in the preview</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>AI Rewrite</CardTitle>
              <CardDescription>Rewrite sections with different tones instantly</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Application Tracking</CardTitle>
              <CardDescription>Track all your applications in one dashboard</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>DOCX & PDF Export</CardTitle>
              <CardDescription>Download in the format you need</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Keyword Analysis</CardTitle>
              <CardDescription>See matched and missing keywords</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="text-3xl font-bold mt-4">$0/mo</div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>✅ 5 tailored resumes per month</p>
                <p>✅ ATS score analysis</p>
                <p>✅ Basic editing</p>
                <p>✅ DOCX & PDF export</p>
                <Link href="/signup">
                  <Button className="w-full mt-4" variant="outline">Start Free</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For serious job seekers</CardDescription>
                <div className="text-3xl font-bold mt-4">$19/mo</div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>✅ Unlimited tailored resumes</p>
                <p>✅ Advanced ATS analytics</p>
                <p>✅ AI rewrite feature</p>
                <p>✅ Priority support</p>
                <p>✅ Application tracking</p>
                <Link href="/signup">
                  <Button className="w-full mt-4">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Land Your Dream Job?</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of job seekers who are getting more interviews with Resume Tailor.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8 py-6">
            Get Started Free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Resume Tailor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
