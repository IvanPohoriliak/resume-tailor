import { StructuredResume, Keywords } from '@/types';

// Score breakdown type
export interface ATSBreakdown {
  keywords: { score: number; max: number };
  experience: { score: number; max: number };
  skills: { score: number; max: number };
  education: { score: number; max: number };
  format: { score: number; max: number };
}

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
  // Extended stop words including common job posting terms
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'we', 'you', 'your', 'our', 'their',
    // Common job posting words to ignore
    'job', 'role', 'position', 'company', 'team', 'work', 'working',
    'experience', 'years', 'year', 'looking', 'seeking', 'hiring',
    'join', 'about', 'this', 'what', 'who', 'how', 'why', 'when',
    'where', 'which', 'would', 'could', 'should', 'have', 'has',
    'been', 'being', 'were', 'they', 'them', 'these', 'those',
    'can', 'may', 'must', 'shall', 'might', 'need', 'want',
    'also', 'well', 'just', 'only', 'even', 'more', 'most', 'some',
    'any', 'all', 'each', 'every', 'both', 'few', 'other', 'such',
    'into', 'over', 'after', 'before', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'very', 'own',
    'same', 'than', 'too', 'now', 'during', 'through', 'across',
    'ability', 'able', 'knowledge', 'skills', 'strong', 'excellent',
    'good', 'great', 'best', 'better', 'high', 'new', 'first',
    'within', 'including', 'include', 'includes', 'required', 'requirements',
    'preferred', 'plus', 'bonus', 'ideal', 'candidate', 'candidates',
    'opportunity', 'opportunities', 'responsibilities', 'responsible',
    'ensure', 'provide', 'support', 'develop', 'create', 'build',
    'manage', 'lead', 'help', 'make', 'take', 'use', 'using',
    'based', 'like', 'understand', 'understanding', 'culture', 'aligned',
    'performance', 'success', 'successful', 'key', 'part', 'full'
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

  // Also extract specific technical terms that might appear only once
  const technicalTerms = text.match(/\b(python|javascript|typescript|java|c\+\+|react|node|angular|vue|aws|azure|gcp|docker|kubernetes|sql|postgresql|mongodb|redis|api|rest|graphql|ci\/cd|git|github|gitlab|jenkins|terraform|ansible|linux|agile|scrum|jira|confluence|figma|tableau|power\s*bi|salesforce|sap)\b/gi) || [];

  technicalTerms.forEach(term => {
    const normalized = term.toLowerCase().replace(/\s+/g, ' ');
    if (!wordCount.has(normalized)) {
      wordCount.set(normalized, 1);
    }
  });

  return Array.from(wordCount.entries())
    .filter(([word, count]) => count >= 1 && !stopWords.has(word))
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

// Helper to test keyword category without global regex issues
function isTechnical(keyword: string): boolean {
  return /^(python|javascript|typescript|java|c\+\+|react|node|angular|vue|aws|azure|gcp|docker|kubernetes|sql|nosql|postgresql|mongodb|redis|api|rest|graphql|ci\/cd|git|github|gitlab|jenkins|terraform|ansible|linux|unix|agile|scrum|kanban|devops|microservices|machine learning|ai|data science|blockchain|html|css|sass|webpack|npm|yarn)$/i.test(keyword);
}

function isTool(keyword: string): boolean {
  return /^(jira|confluence|slack|teams|figma|sketch|adobe|excel|powerpoint|word|tableau|power bi|salesforce|hubspot|sap|erp|crm|quickbooks|asana|trello|notion|postman|swagger|datadog|splunk|grafana)$/i.test(keyword);
}

function isSoftSkill(keyword: string): boolean {
  return /^(leadership|communication|teamwork|problem.solving|analytical|creative|adaptable|collaborative|strategic|organizational|time.management|critical.thinking|conflict.resolution|negotiation|mentoring)$/i.test(keyword);
}

function isCertification(keyword: string): boolean {
  return /^(pmp|prince2|aws certified|azure certified|google cloud|scrum master|csm|psm|six sigma|lean|cpa|cfa|mba|phd|cissp|cism|comptia|itil)$/i.test(keyword);
}

// Generate detailed categorized recommendations
export function generateDetailedRecommendations(
  resume: StructuredResume,
  jobDescription: string,
  keywordAnalysis: { matched: string[]; missing: string[] }
): string[] {
  const recommendations: string[] = [];

  // Categorize missing keywords
  const missingTechnical: string[] = [];
  const missingSoft: string[] = [];
  const missingTools: string[] = [];
  const missingCerts: string[] = [];
  const missingOther: string[] = [];

  keywordAnalysis.missing.forEach(keyword => {
    if (isTechnical(keyword)) missingTechnical.push(keyword);
    else if (isTool(keyword)) missingTools.push(keyword);
    else if (isSoftSkill(keyword)) missingSoft.push(keyword);
    else if (isCertification(keyword)) missingCerts.push(keyword);
    else missingOther.push(keyword);
  });

  // Hard Skills recommendations - show specific missing tech
  if (missingTechnical.length > 0) {
    recommendations.push(`Skills: Add ${missingTechnical.slice(0, 4).join(', ')} to your resume`);
  }

  // Tools recommendations
  if (missingTools.length > 0) {
    recommendations.push(`Tools: Include experience with ${missingTools.slice(0, 3).join(', ')}`);
  }

  // Soft Skills recommendations
  if (missingSoft.length > 0) {
    recommendations.push(`Soft Skills: Demonstrate ${missingSoft.slice(0, 2).join(', ')}`);
  }

  // Certifications
  if (missingCerts.length > 0) {
    recommendations.push(`Certifications: Consider ${missingCerts.slice(0, 2).join(', ')}`);
  }

  // Skills score check
  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const skillsInJob = skills.filter(s => jobDescription.toLowerCase().includes(s.toLowerCase()));
  if (skills.length > 0 && skillsInJob.length < skills.length * 0.3) {
    recommendations.push('Skills: Align your skills section with job requirements');
  }

  // Experience recommendations
  const allBullets = resume.experience.flatMap(e => e.bullets);
  const quantifiedCount = allBullets.filter(b => /\d+%|\$[\d,]+|\d+\s*(users|customers|clients|projects|team|people)/i.test(b)).length;
  if (allBullets.length > 0 && quantifiedCount < allBullets.length * 0.4) {
    recommendations.push('Experience: Add metrics (%, $, numbers) to achievements');
  }

  // Summary optimization - check if key job terms are in summary
  const summary = (resume.summary || '').toLowerCase();
  const topMatchedTech = keywordAnalysis.matched.filter(k => isTechnical(k)).slice(0, 3);
  const techNotInSummary = topMatchedTech.filter(k => !summary.includes(k.toLowerCase()));
  if (techNotInSummary.length > 0 && topMatchedTech.length > 0) {
    recommendations.push(`Summary: Mention ${techNotInSummary.slice(0, 2).join(', ')} in summary`);
  }

  // Education
  const hasDegreeReq = /bachelor|master|mba|phd|degree/i.test(jobDescription);
  if (hasDegreeReq && resume.education.length === 0) {
    recommendations.push('Education: Add relevant degree or certifications');
  }

  // Keyword frequency - find important keywords used only once
  const resumeText = resumeToText(resume).toLowerCase();
  const importantKeywords = keywordAnalysis.matched.filter(k => isTechnical(k) || isTool(k)).slice(0, 5);
  const lowFrequency = importantKeywords.filter(k => {
    const count = (resumeText.match(new RegExp(`\\b${k}\\b`, 'gi')) || []).length;
    return count === 1;
  });
  if (lowFrequency.length > 0) {
    recommendations.push(`Keywords: Use ${lowFrequency.slice(0, 2).join(', ')} more frequently`);
  }

  return recommendations;
}

// Score skills separately (0-15 points)
function scoreSkills(resume: StructuredResume, jobDescription: string): number {
  const jobLower = jobDescription.toLowerCase();
  const skills = Array.isArray(resume.skills) ? resume.skills : [];

  if (skills.length === 0) return 0;

  let matchedSkills = 0;
  skills.forEach(skill => {
    if (jobLower.includes(skill.toLowerCase())) {
      matchedSkills++;
    }
  });

  const matchRatio = skills.length > 0 ? matchedSkills / Math.min(skills.length, 10) : 0;
  return Math.round(matchRatio * 15);
}

// Score education separately (0-15 points)
function scoreEducation(resume: StructuredResume, jobDescription: string): number {
  const hasDegreeReq = /bachelor|master|mba|phd|degree/i.test(jobDescription);

  if (!hasDegreeReq) return 15;

  if (resume.education.length > 0) {
    const degrees = resume.education.map(e => e.degree.toLowerCase()).join(' ');
    const jobLower = jobDescription.toLowerCase();

    if (
      (jobLower.includes('master') && degrees.includes('master')) ||
      (jobLower.includes('phd') && degrees.includes('phd')) ||
      (jobLower.includes('mba') && degrees.includes('mba'))
    ) {
      return 15;
    } else if (
      (jobLower.includes('bachelor') && degrees.includes('bachelor')) ||
      degrees.includes('master') || degrees.includes('phd')
    ) {
      return 12;
    }
    return 8;
  }
  return 3;
}

// Score format/structure (0-5 points)
function scoreFormat(resume: StructuredResume): number {
  let score = 0;

  if (resume.summary && resume.summary.length > 50) score += 1;
  if (resume.experience.length >= 2) score += 1;
  if (resume.experience.every(e => e.bullets.length >= 2)) score += 1;
  if (Array.isArray(resume.skills) && resume.skills.length >= 5) score += 1;
  if (resume.education.length >= 1) score += 1;

  return score;
}

// Main improved calculation with detailed recommendations
export function calculateATSScore(
  resume: StructuredResume,
  jobDescription: string
): { score: number; keywords: Keywords; recommendations: string[]; breakdown: ATSBreakdown; missingKeywords: string[] } {

  const jobKeywords = extractKeywords(jobDescription);

  // Calculate weighted scores for each component
  const keywordAnalysis = calculateWeightedKeywordScore(resume, jobKeywords);

  // Experience: quantified achievements (0-25 points)
  const allBullets = resume.experience.flatMap(e => e.bullets);
  const quantifiedCount = allBullets.filter(b => /\d+%|\$\d+|\d+\+|\d+/.test(b)).length;
  const quantificationRatio = allBullets.length > 0 ? quantifiedCount / allBullets.length : 0;
  const experienceScore = Math.round(quantificationRatio * 20) + (resume.experience.length >= 2 ? 5 : 0);

  const skillsScore = scoreSkills(resume, jobDescription);
  const educationScore = scoreEducation(resume, jobDescription);
  const formatScore = scoreFormat(resume);

  // Adjust keyword score to 40 max (instead of 50) to fit new breakdown
  const keywordsScoreAdjusted = Math.round(keywordAnalysis.score * 0.8);

  // Total: 40 (keywords) + 25 (experience) + 15 (skills) + 15 (education) + 5 (format) = 100
  const totalScore = keywordsScoreAdjusted + Math.min(experienceScore, 25) + skillsScore + educationScore + formatScore;

  // Build breakdown
  const breakdown: ATSBreakdown = {
    keywords: { score: keywordsScoreAdjusted, max: 40 },
    experience: { score: Math.min(experienceScore, 25), max: 25 },
    skills: { score: skillsScore, max: 15 },
    education: { score: educationScore, max: 15 },
    format: { score: formatScore, max: 5 }
  };

  // Generate detailed recommendations
  const recommendations = generateDetailedRecommendations(
    resume,
    jobDescription,
    keywordAnalysis
  );

  // Return with recommendations and breakdown
  return {
    score: Math.min(Math.round(totalScore), 100),
    keywords: {
      matched: keywordAnalysis.matched,
      missing: recommendations
    },
    recommendations,
    breakdown,
    missingKeywords: keywordAnalysis.missing
  };
}

// Keep legacy function for compatibility
export function generateATSRecommendations(
  resume: StructuredResume,
  jobDescription: string,
  currentScore: number
): string[] {
  const result = calculateATSScore(resume, jobDescription);
  return result.recommendations;
}
