import { StructuredResume, Keywords } from '@/types';

export function extractKeywords(text: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'we', 'you', 'your', 'our', 'their'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Count frequency
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Get top keywords (appearing 2+ times)
  return Array.from(wordCount.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);
}

export function resumeToText(resume: StructuredResume): string {
  const parts = [
    resume.contact.name,
    resume.contact.email,
    resume.summary || '',
    ...resume.experience.flatMap(exp => [
      exp.company,
      exp.role,
      ...exp.bullets
    ]),
    ...resume.education.flatMap(edu => [
      edu.school,
      edu.degree,
      edu.details || ''
    ]),
    ...resume.skills
  ];

  return parts.filter(Boolean).join(' ');
}

export function calculateATSScore(
  resume: StructuredResume,
  jobDescription: string
): { score: number; keywords: Keywords } {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeText = resumeToText(resume).toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  jobKeywords.forEach(keyword => {
    if (resumeText.includes(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  const score = jobKeywords.length > 0
    ? Math.round((matched.length / jobKeywords.length) * 100)
    : 0;

  return {
    score,
    keywords: { matched, missing }
  };
}
