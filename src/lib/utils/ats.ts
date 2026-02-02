import { StructuredResume, Keywords } from '@/types';

// Keyword categories with weights
const KEYWORD_WEIGHTS = {
  technical: 3,    // Python, AWS, Docker
  soft: 1,         // Leadership, Communication
  tools: 2,        // JIRA, Figma, SAP
  industry: 1,     // SaaS, Fintech
  certifications: 2 // PMP, AWS Certified
};

const TECHNICAL_PATTERNS = /\b(python|javascript|java|c\+\+|react|node|angular|vue|aws|azure|gcp|docker|kubernetes|sql|nosql|api|rest|graphql|ci\/cd|git|github|jenkins|terraform|ansible|linux|unix|agile|scrum|kanban|devops|microservices|machine learning|ai|data science|blockchain)\b/gi;
const SOFT_PATTERNS = /\b(leadership|communication|teamwork|problem.solving|analytical|creative|adaptable|collaborative|strategic|organizational|time.management|critical.thinking|conflict.resolution|negotiation|mentoring)\b/gi;
const TOOLS_PATTERNS = /\b(jira|confluence|slack|teams|figma|sketch|adobe|excel|powerpoint|word|tableau|power bi|salesforce|hubspot|sap|erp|crm|quickbooks|asana|trello|notion)\b/gi;
const INDUSTRY_PATTERNS = /\b(saas|paas|fintech|ecommerce|e-commerce|b2b|b2c|marketplace|startup|enterprise|manufacturing|retail|healthcare|finance|insurance|telecommunications|energy|logistics|consulting)\b/gi;
const CERT_PATTERNS = /\b(pmp|prince2|aws certified|azure certified|google cloud|scrum master|csm|psm|six sigma|lean|cpa|cfa|mba|phd|cissp|cism|comptia|itil)\b/gi;

export function extractKeywords(text: string): string[] {
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

  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

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
    ...(Array.isArray(resume.skills) ? resume.skills : 
        typeof resume.skills === 'object' ? Object.values(resume.skills).flat() :
        typeof resume.skills === 'string' ? [resume.skills] : [])
  ];

  return parts.filter(Boolean).join(' ');
}

// Helper: Calculate weighted keyword score
function calculateWeightedKeywordScore(
  resume: StructuredResume,
  jobKeywords: string[]
): { score: number; matched: string[]; missing: string[] } {
  
  const resumeText = resumeToText(resume).toLowerCase();
  const summary = (resume.summary || '').toLowerCase();
  const experienceText = resume.experience.flatMap(e => e.bullets).join(' ').toLowerCase();
  
  const matched: string[] = [];
  const missing: string[] = [];
  
  let totalPoints = 0;
  let maxPossiblePoints = 0;

  jobKeywords.forEach(keyword => {
    // Determine keyword category and weight
    let weight = 1;
    if (TECHNICAL_PATTERNS.test(keyword)) weight = KEYWORD_WEIGHTS.technical;
    else if (TOOLS_PATTERNS.test(keyword)) weight = KEYWORD_WEIGHTS.tools;
    else if (CERT_PATTERNS.test(keyword)) weight = KEYWORD_WEIGHTS.certifications;
    else if (SOFT_PATTERNS.test(keyword)) weight = KEYWORD_WEIGHTS.soft;
    else if (INDUSTRY_PATTERNS.test(keyword)) weight = KEYWORD_WEIGHTS.industry;
    
    maxPossiblePoints += weight;
    
    if (resumeText.includes(keyword)) {
      matched.push(keyword);
      let points = weight;
      
      // Location bonus
      if (summary.includes(keyword)) {
        points *= 1.3; // +30% for summary
      } else if (experienceText.includes(keyword)) {
        points *= 1.15; // +15% for experience
      }
      
      // Frequency bonus
      const frequency = (resumeText.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      if (frequency >= 3) points *= 1.15;
      else if (frequency === 2) points *= 1.08;
      
      totalPoints += points;
    } else {
      missing.push(keyword);
    }
  });

  // Keywords: 0-50 points (50% of total score)
  const keywordScore = maxPossiblePoints > 0 
    ? Math.round((totalPoints / maxPossiblePoints) * 50)
    : 0;

  return { score: Math.min(keywordScore, 50), matched, missing };
}

// Helper: Score experience relevance
function scoreExperience(resume: StructuredResume, jobDescription: string): number {
  let score = 0;

  // Years of experience (0-15 points)
  const yearsRegex = /(\d+)\+?\s*years?/gi;
  const yearsMatches = jobDescription.match(yearsRegex);
  const requiredYears = yearsMatches ? parseInt(yearsMatches[0]) : 0;
  const resumeYears = resume.experience.length * 2.5; // Rough estimate
  
  if (requiredYears === 0) {
    score += 15; // No requirement
  } else if (Math.abs(resumeYears - requiredYears) <= 1) {
    score += 15; // Perfect match
  } else if (Math.abs(resumeYears - requiredYears) <= 3) {
    score += 10; // Close match
  } else {
    score += 5; // Some experience
  }

  // Quantified achievements (0-10 points)
  const allBullets = resume.experience.flatMap(e => e.bullets);
  const quantifiedCount = allBullets.filter(b => /\d+%|\$\d+|\d+\+/.test(b)).length;
  const quantificationRatio = allBullets.length > 0 ? quantifiedCount / allBullets.length : 0;
  score += Math.round(quantificationRatio * 10);

  return Math.min(score, 25); // Max 25 points for experience
}

// Helper: Score other factors
function scoreOtherFactors(resume: StructuredResume, jobDescription: string): number {
  let score = 0;

  // Education match (0-15 points)
  const hasDegreeReq = /bachelor|master|mba|phd|degree/i.test(jobDescription);
  if (!hasDegreeReq) {
    score += 15;
  } else if (resume.education.length > 0) {
    const degrees = resume.education.map(e => e.degree.toLowerCase()).join(' ');
    const jobLower = jobDescription.toLowerCase();
    if (
      (jobLower.includes('bachelor') && degrees.includes('bachelor')) ||
      (jobLower.includes('master') && degrees.includes('master')) ||
      (jobLower.includes('mba') && degrees.includes('mba'))
    ) {
      score += 15; // Exact match
    } else {
      score += 10; // Has some degree
    }
  } else {
    score += 5; // No degree but required
  }

  // Resume structure (0-10 points)
  if (resume.summary && resume.summary.length > 50) score += 3;
  if (resume.experience.length >= 2) score += 2;
  if (resume.experience.every(e => e.bullets.length >= 2)) score += 3;
  if (resume.skills) score += 2;

  return Math.min(score, 25); // Max 25 points for other factors
}

// Main improved calculation with simple output
export function calculateATSScore(
  resume: StructuredResume,
  jobDescription: string
): { score: number; keywords: Keywords } {
  
  const jobKeywords = extractKeywords(jobDescription);
  
  // Calculate weighted scores for each component
  const keywordAnalysis = calculateWeightedKeywordScore(resume, jobKeywords);
  const experienceScore = scoreExperience(resume, jobDescription);
  const otherScore = scoreOtherFactors(resume, jobDescription);
  
  // Total: 50 (keywords) + 25 (experience) + 25 (other) = 100
  const totalScore = keywordAnalysis.score + experienceScore + otherScore;
  
  // Return simple format (backwards compatible)
  return {
    score: Math.min(Math.round(totalScore), 100),
    keywords: {
      matched: keywordAnalysis.matched,
      missing: keywordAnalysis.missing.slice(0, 5) // Top 5 missing
    }
  };
}

// Helper: Generate improved recommendations based on score breakdown
export function generateATSRecommendations(
  resume: StructuredResume,
  jobDescription: string,
  currentScore: number
): string[] {
  const recommendations: string[] = [];
  const jobKeywords = extractKeywords(jobDescription);
  const keywordAnalysis = calculateWeightedKeywordScore(resume, jobKeywords);
  
  // Keyword-based recommendations
  if (keywordAnalysis.missing.length > 0) {
    const topMissing = keywordAnalysis.missing.slice(0, 3);
    recommendations.push(`Add these key skills: ${topMissing.join(', ')}`);
  }
  
  // Technical skills in summary
  const summary = (resume.summary || '').toLowerCase();
  const hasTechnicalInSummary = TECHNICAL_PATTERNS.test(summary);
  if (!hasTechnicalInSummary && keywordAnalysis.matched.some(k => TECHNICAL_PATTERNS.test(k))) {
    recommendations.push('Move key technical skills to your professional summary for 30% score boost');
  }
  
  // Quantification
  const allBullets = resume.experience.flatMap(e => e.bullets);
  const quantifiedCount = allBullets.filter(b => /\d+/.test(b)).length;
  if (quantifiedCount < allBullets.length * 0.4) {
    recommendations.push('Add numbers/metrics to your achievements (can add +10 points)');
  }
  
  // Education
  const hasDegreeReq = /bachelor|master|mba|degree/i.test(jobDescription);
  if (hasDegreeReq && resume.education.length === 0) {
    recommendations.push('Add relevant education or certifications (+15 points)');
  }
  
  // Keyword frequency
  const resumeText = resumeToText(resume).toLowerCase();
  const topKeywords = keywordAnalysis.matched.slice(0, 5);
  const lowFrequency = topKeywords.filter(k => {
    const count = (resumeText.match(new RegExp(`\\b${k}\\b`, 'gi')) || []).length;
    return count < 2;
  });
  if (lowFrequency.length > 0) {
    recommendations.push(`Mention these skills more than once: ${lowFrequency.slice(0, 2).join(', ')}`);
  }
  
  return recommendations.slice(0, 3);
}
