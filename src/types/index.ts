export interface Contact {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  dates: string;
  details?: string;
}

export interface StructuredResume {
  contact: Contact;
  summary?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
}

export interface Resume {
  id: string;
  userId: string;
  originalFileUrl: string;
  structured: StructuredResume;
  createdAt: string;
}

export interface JobMetadata {
  company?: string;
  role?: string;
  location?: string;
}

export interface Keywords {
  matched: string[];
  missing: string[];
}

export interface Application {
  id: string;
  userId: string;
  resumeId: string;
  jobDescription: string;
  jobMetadata: JobMetadata;
  tailoredResume: StructuredResume;
  atsScore: number;
  keywords: Keywords;
  status: 'applied' | 'screening' | 'interview' | 'rejected' | 'offer';
  appliedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageTracking {
  id: string;
  userId: string;
  month: string;
  resumesGenerated: number;
  resetAt: string;
}

export type SubscriptionTier = 'free' | 'pro';

export interface User {
  id: string;
  email: string;
  name?: string;
  subscription: SubscriptionTier;
  createdAt: string;
}
