export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type ApplicationStatus = 'applied' | 'interview' | 'offered' | 'rejected';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    profile?: UserProfile;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfile {
    id: string;
    userId: string;
    name: string;
    age?: number;
    location: string;
    resumeId?: string | null;
    skills: string[];
    experienceLevel: ExperienceLevel;
    preferences: JobPreferences;
    createdAt: Date;
    updatedAt: Date;
}

export interface JobPreferences {
    locations: string[];
    experienceLevels: ExperienceLevel[];
    keywords: string[];
    salaryRange?: {
        min: number;
        max: number;
    };
    remoteWork: boolean;
}

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string[];
    experienceLevel: ExperienceLevel;
    applicationUrl: string;
    isAvailable: boolean;
    crawledAt: Date;
    updatedAt: Date;
}

export interface Application {
    id: string;
    userId: string;
    jobId: string;
    status: ApplicationStatus;
    appliedAt: Date;
    coverLetter?: string;
    notes?: string;
    interviewDate?: Date;
    statusHistory: StatusChange[];
}

export interface StatusChange {
    id: string;
    applicationId: string;
    fromStatus?: ApplicationStatus;
    toStatus: ApplicationStatus;
    changedAt: Date;
    notes?: string;
}

export interface LLMConfig {
    provider: 'openai' | 'claude' | 'gemini' | 'ollama';
    apiKey?: string;
    endpoint?: string;
    model: string;
}

export interface ParsedResume {
    personalInfo: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
    };
    experience: Array<{
        company: string;
        position: string;
        duration: string;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        year: string;
    }>;
    skills: string[];
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
    };
}