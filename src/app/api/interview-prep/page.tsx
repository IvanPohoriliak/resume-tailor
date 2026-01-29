'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface Question {
  type: string;
  question: string;
}

interface Feedback {
  score: number;
  structure_score?: number;
  relevance_score?: number;
  impact_score?: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

interface FinalFeedback {
  assessment: string;
  strengths: string[];
  weaknesses: string[];
  actions: string[];
}

function InterviewPrepContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalFeedback, setFinalFeedback] = useState<FinalFeedback | null>(null);

  useEffect(() => {
    if (!applicationId) {
      router.push('/dashboard');
      return;
    }
    generateQuestions();
  }, [applicationId]);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/interview-prep/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();
      if (data.sessionId && data.questions) {
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setLoading(false);
      } else {
        alert('Failed to generate questions');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Error generating questions');
      router.push('/dashboard');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !sessionId) return;

    setSubmitting(true);
    try {
      const currentQuestion = questions[currentIndex];
      const response = await fetch('/api/interview-prep/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentIndex,
          question: currentQuestion.question,
          questionType: currentQuestion.type,
          answer,
        }),
      });

      const data = await response.json();
      if (data.feedback) {
        setFeedback(data.feedback);
        setShowingFeedback(true);
      }
    } catch (error) {
      console.error('Error analyzing answer:', error);
      alert('Error analyzing answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setShowingFeedback(false);
    setFeedback(null);
    setAnswer('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions done - generate final summary
      completSession();
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/interview-prep/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (data.overallScore !== undefined && data.feedback) {
        setFinalScore(data.overallScore);
        setFinalFeedback(data.feedback);
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Error generating final summary');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Generating interview questions...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 10-15 seconds</p>
        </div>
      </div>
    );
  }

  if (completed && finalFeedback) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Complete!</h1>
            <p className="text-gray-600">Here's your performance summary</p>
          </div>

          {/* Overall Score */}
          <Card className="mb-6">
            <CardContent className="pt-8 pb-8 text-center">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreColor(finalScore)} mb-4`}>
                <span className="text-5xl font-bold">{finalScore}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Overall Score</h2>
              <p className="text-gray-600">{finalFeedback.assessment}</p>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Top Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {finalFeedback.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas to Improve */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {finalFeedback.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    <span className="text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Plan */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {finalFeedback.actions.map((action, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="font-semibold text-blue-600 mr-2">{idx + 1}.</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" variant="outline">Back to Dashboard</Button>
            </Link>
            <Button 
              size="lg" 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Practice Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
          <div className="text-sm text-gray-600">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-2">
              {currentQuestion.type.toUpperCase()}
            </div>
            <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
          </CardHeader>
        </Card>

        {!showingFeedback ? (
          /* Answer Input */
          <Card>
            <CardContent className="pt-6">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here... (Aim for 200-500 words)"
                className="min-h-[300px] text-base"
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  {answer.split(' ').filter(w => w).length} words
                </span>
                <Button 
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || submitting}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Analyzing...' : 'Submit Answer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Feedback */
          <div className="space-y-6">
            {/* Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Score</h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Structure: {feedback?.structure_score}/10</span>
                      <span>Relevance: {feedback?.relevance_score}/10</span>
                      <span>Impact: {feedback?.impact_score}/10</span>
                    </div>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(feedback?.score || 0)} px-6 py-3 rounded-lg`}>
                    {feedback?.score}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            {feedback?.strengths && feedback.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">✓ Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">• {strength}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Weaknesses */}
            {feedback?.weaknesses && feedback.weaknesses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-orange-700">! Areas to Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-gray-700">• {weakness}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {feedback?.suggestions && feedback.suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700">💡 Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedback.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-gray-700">• {suggestion}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={handleNextQuestion}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentIndex < questions.length - 1 ? 'Next Question →' : 'Complete Interview'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InterviewPrepContent />
    </Suspense>
  );
}
