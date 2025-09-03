// Database entity types and interfaces

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type ApplicationStatus = 'applied' | 'interview' | 'offered' | 'rejected';

// User related interfaces
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserRegistration {
    email: string;
    password: string;
    name: string;
    location: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface UserUpdate {
    name?: string;
    age?: number;
    location?: string;
    resumeId?: string | null;
    skills?: string[];
    experienceLevel?: ExperienceLevel;
    preferences?: JobPreferences;
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

// Job related interfaces
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

export interface JobFilters {
    keywords?: string;
    location?: string;
    experienceLevel?: ExperienceLevel;
    company?: string;
    isAvailable?: boolean;
    limit?: number;
    offset?: number;
}

// Application related interfaces
export interface Application {
    id: string;
    userId: string;
    jobId: string;
    status: ApplicationStatus;
    appliedAt: Date;
    coverLetter?: string;
    notes?: string;
    interviewDate?: Date;
}

export interface StatusChange {
    id: string;
    applicationId: string;
    fromStatus?: ApplicationStatus;
    toStatus: ApplicationStatus;
    changedAt: Date;
    notes?: string;
}

// Database row interfaces (matching actual DB schema)
export interface UserRow {
    id: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}

export interface UserProfileRow {
    id: string;
    user_id: string;
    name: string;
    age?: number;
    location: string;
    resume_id?: string | null;
    skills: string[];
    experience_level: ExperienceLevel;
    preferences: JobPreferences;
    created_at: Date;
    updated_at: Date;
}

export interface JobRow {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string[];
    experience_level: ExperienceLevel;
    application_url: string;
    is_available: boolean;
    crawled_at: Date;
    updated_at: Date;
}

export interface ApplicationRow {
    id: string;
    user_id: string;
    job_id: string;
    status: ApplicationStatus;
    applied_at: Date;
    cover_letter?: string;
    notes?: string;
    interview_date?: Date;
}

export interface StatusChangeRow {
    id: string;
    application_id: string;
    from_status?: ApplicationStatus;
    to_status: ApplicationStatus;
    changed_at: Date;
    notes?: string;
}