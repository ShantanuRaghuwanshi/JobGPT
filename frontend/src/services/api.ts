import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors and enhance error information
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Enhance error with additional context
        const enhancedError = {
            ...error,
            timestamp: new Date().toISOString(),
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
        };

        // Handle specific error cases
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            // Forbidden - user doesn't have permission
            console.warn('Access denied:', error.response.data);
        } else if (error.response?.status >= 500) {
            // Server errors
            console.error('Server error:', error.response.data);
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            // Network errors
            enhancedError.code = 'NETWORK_ERROR';
            enhancedError.message = 'Network error. Please check your connection.';
        } else if (error.code === 'ECONNABORTED') {
            // Timeout errors
            enhancedError.code = 'TIMEOUT_ERROR';
            enhancedError.message = 'Request timed out. Please try again.';
        }

        return Promise.reject(enhancedError);
    }
);

// API response types
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message: string;
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
    };
}

// Auth API types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    location: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}

export interface UserResponse {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

// Profile API types
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';

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
    createdAt: string;
    updatedAt: string;
}

export interface ProfileUpdateRequest {
    name?: string;
    age?: number;
    location?: string;
    skills?: string[];
    experienceLevel?: ExperienceLevel;
    preferences?: JobPreferences;
}

export interface ResumeUploadResponse {
    resumeId: string;
    message: string;
    url: string;
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

export interface ResumeUploadWithParsingResponse {
    resumeId: string;
    parsedData?: ParsedResume;
    parseError?: string;
    message: string;
    url: string;
}

export interface ResumeParseResponse {
    parsedData: ParsedResume;
    message: string;
}

export interface LLMConfigResponse {
    provider?: string;
    model?: string;
    endpoint?: string;
    configured: boolean;
}

export interface LLMProvidersResponse {
    providers: {
        [key: string]: {
            name: string;
            requiresApiKey?: boolean;
            requiresEndpoint?: boolean;
            models: string[];
        };
    };
    supportedFileTypes: string[];
}

export interface LLMConfig {
    provider: 'openai' | 'claude' | 'gemini' | 'ollama';
    apiKey?: string;
    endpoint?: string;
    model: string;
}

// Job API types
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
    crawledAt: string;
    updatedAt: string;
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

export interface JobSearchResult {
    jobs: Job[];
    total: number;
    hasMore: boolean;
}

export interface JobMatch {
    job: Job;
    score: number;
    matchReasons: string[];
    skillMatches: string[];
    locationMatch: boolean;
    experienceMatch: boolean;
}

export interface JobMatchFilters {
    minScore?: number;
    maxResults?: number;
    excludeApplied?: boolean;
    experienceLevels?: ExperienceLevel[];
    locations?: string[];
    keywords?: string[];
}

export interface JobMatchResult {
    matches: JobMatch[];
    total: number;
    userProfile: UserProfile;
    appliedJobIds: string[];
}

export type ApplicationStatus = 'applied' | 'interview' | 'offered' | 'rejected';

export interface Application {
    id: string;
    userId: string;
    jobId: string;
    status: ApplicationStatus;
    appliedAt: string;
    coverLetter?: string;
    notes?: string;
    interviewDate?: string;
}

export interface StatusChange {
    id: string;
    applicationId: string;
    fromStatus?: ApplicationStatus;
    toStatus: ApplicationStatus;
    changedAt: string;
    notes?: string;
}

export interface ApplicationStats {
    total: number;
    applied: number;
    interview: number;
    offered: number;
    rejected: number;
}

export interface StatusUpdateRequest {
    status: ApplicationStatus;
    notes?: string;
    interviewDate?: string;
}

// Auth API endpoints
export const authApi = {
    login: (credentials: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
        apiClient.post('/auth/login', credentials),

    register: (userData: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
        apiClient.post('/auth/register', userData),

    verifyToken: (): Promise<AxiosResponse<{ user: any; valid: boolean }>> =>
        apiClient.post('/auth/verify'),

    getCurrentUser: (): Promise<AxiosResponse<UserResponse>> =>
        apiClient.get('/auth/me'),
};

// Profile API endpoints
export const profileApi = {
    getProfile: (): Promise<AxiosResponse<UserProfile>> =>
        apiClient.get('/profile'),

    updateProfile: (updates: ProfileUpdateRequest): Promise<AxiosResponse<UserProfile>> =>
        apiClient.put('/profile', updates),

    uploadResume: (file: File): Promise<AxiosResponse<ResumeUploadResponse>> => {
        const formData = new FormData();
        formData.append('resume', file);
        return apiClient.post('/profile/resume', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getResumeUrl: (resumeId: string): string =>
        `${API_BASE_URL}/profile/resume/${resumeId}`,

    deleteResume: (): Promise<AxiosResponse<{ message: string }>> =>
        apiClient.delete('/profile/resume'),

    uploadAndParseResume: (file: File): Promise<AxiosResponse<ResumeUploadWithParsingResponse>> => {
        const formData = new FormData();
        formData.append('resume', file);
        return apiClient.post('/profile/resume/upload-and-parse', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    parseResume: (): Promise<AxiosResponse<ResumeParseResponse>> =>
        apiClient.post('/profile/resume/parse'),

    applyParsedData: (parsedData: ParsedResume): Promise<AxiosResponse<{ profile: UserProfile; message: string }>> =>
        apiClient.post('/profile/resume/apply-parsed-data', { parsedData }),

    getResumeParsingStatus: (): Promise<AxiosResponse<{
        hasResume: boolean;
        canParse: boolean;
        llmConfigured: boolean;
        resumeId?: string;
    }>> =>
        apiClient.get('/profile/resume/parsing-status'),
};

// LLM API endpoints
export const llmApi = {
    getConfig: (): Promise<AxiosResponse<LLMConfigResponse>> =>
        apiClient.get('/llm/config'),

    updateConfig: (config: LLMConfig): Promise<AxiosResponse<{
        message: string;
        connectionTest: boolean;
        config: LLMConfigResponse;
    }>> =>
        apiClient.put('/llm/config', config),

    testConnection: (): Promise<AxiosResponse<{
        connected: boolean;
        message: string;
    }>> =>
        apiClient.post('/llm/test-connection'),

    getProviders: (): Promise<AxiosResponse<LLMProvidersResponse>> =>
        apiClient.get('/llm/providers'),
};

// Job scraping API types
export interface CrawlJobRequest {
    validateExisting?: boolean;
    companies?: string[];
}

export interface CrawlJobResponse {
    jobId: string;
    message: string;
}

export interface QueueStats {
    crawling: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    };
    validation: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    };
}

// Job API endpoints
export const jobApi = {
    getJobs: (filters?: JobFilters): Promise<AxiosResponse<JobSearchResult>> =>
        apiClient.get('/jobs', { params: filters }),

    getJobById: (jobId: string): Promise<AxiosResponse<Job>> =>
        apiClient.get(`/jobs/${jobId}`),

    searchJobs: (query: string, filters?: Omit<JobFilters, 'keywords'>): Promise<AxiosResponse<JobSearchResult>> =>
        apiClient.get('/jobs/search', { params: { q: query, ...filters } }),

    getJobMatches: (filters?: JobMatchFilters): Promise<AxiosResponse<JobMatchResult>> =>
        apiClient.get('/jobs/matches', { params: filters }),

    getJobRecommendations: (limit?: number): Promise<AxiosResponse<JobMatch[]>> =>
        apiClient.get('/jobs/recommendations', { params: { limit } }),

    getSimilarJobs: (jobId: string, limit?: number): Promise<AxiosResponse<JobMatch[]>> =>
        apiClient.get(`/jobs/${jobId}/similar`, { params: { limit } }),

    applyToJob: (jobId: string): Promise<AxiosResponse<Application>> =>
        apiClient.post(`/jobs/${jobId}/apply`),

    // Job scraping endpoints
    triggerCrawl: (request?: CrawlJobRequest): Promise<AxiosResponse<CrawlJobResponse>> =>
        apiClient.post('/jobs/crawl', request || {}),

    getQueueStats: (): Promise<AxiosResponse<QueueStats>> =>
        apiClient.get('/jobs/queue/stats'),
};

// Application API endpoints
export const applicationApi = {
    getApplications: (status?: ApplicationStatus): Promise<AxiosResponse<{
        applications: Application[];
        count: number;
        status: string;
    }>> =>
        apiClient.get('/applications', { params: status ? { status } : {} }),

    getApplicationById: (applicationId: string): Promise<AxiosResponse<Application>> =>
        apiClient.get(`/applications/${applicationId}`),

    getApplicationStats: (): Promise<AxiosResponse<ApplicationStats>> =>
        apiClient.get('/applications/stats'),

    updateApplicationStatus: (
        applicationId: string,
        updateRequest: StatusUpdateRequest
    ): Promise<AxiosResponse<Application>> =>
        apiClient.put(`/applications/${applicationId}/status`, updateRequest),

    getApplicationHistory: (applicationId: string): Promise<AxiosResponse<{
        applicationId: string;
        history: StatusChange[];
    }>> =>
        apiClient.get(`/applications/${applicationId}/history`),

    addApplicationNotes: (applicationId: string, notes: string): Promise<AxiosResponse<Application>> =>
        apiClient.put(`/applications/${applicationId}/notes`, { notes }),

    updateInterviewDate: (applicationId: string, interviewDate: string): Promise<AxiosResponse<Application>> =>
        apiClient.put(`/applications/${applicationId}/interview-date`, { interviewDate }),

    getValidTransitions: (status: ApplicationStatus): Promise<AxiosResponse<{
        currentStatus: ApplicationStatus;
        validTransitions: ApplicationStatus[];
    }>> =>
        apiClient.get(`/applications/status/${status}/valid-transitions`),
};

// Pipeline API types
export interface PipelineJobWithApplication extends Job {
    applicationId?: string;
    applicationStatus?: ApplicationStatus;
    appliedAt?: string;
    notes?: string;
    interviewDate?: string;
}

export interface PipelineColumn {
    id: string;
    title: string;
    status: ApplicationStatus | 'available';
    jobs: PipelineJobWithApplication[];
}

export interface PipelineData {
    columns: PipelineColumn[];
    totalJobs: number;
}

export interface DragDropRequest {
    jobId: string;
    fromColumn: string;
    toColumn: string;
    position?: number;
}

export interface PipelineStats {
    available: number;
    applied: number;
    interview: number;
    offered: number;
    rejected: number;
}

// Pipeline API endpoints
export const pipelineApi = {
    getPipelineData: (limit?: number): Promise<AxiosResponse<PipelineData>> =>
        apiClient.get('/pipeline', { params: limit ? { limit } : {} }),

    getPipelineStats: (): Promise<AxiosResponse<PipelineStats>> =>
        apiClient.get('/pipeline/stats'),

    handleDragDrop: (request: DragDropRequest): Promise<AxiosResponse<{
        updatedApplication?: Application;
        message: string;
    }>> =>
        apiClient.post('/pipeline/drag-drop', request),

    getValidDropTargets: (jobId: string, currentColumn: string): Promise<AxiosResponse<{
        jobId: string;
        currentColumn: string;
        validDropTargets: string[];
    }>> =>
        apiClient.get('/pipeline/valid-drop-targets', { params: { jobId, currentColumn } }),

    refreshPipelineData: (): Promise<AxiosResponse<PipelineData>> =>
        apiClient.post('/pipeline/refresh'),
};

// Dashboard API types
export interface DashboardStats {
    user: {
        profileComplete: boolean;
        totalApplications: number;
        activeApplications: number;
        interviewsScheduled: number;
        offersReceived: number;
    };
    jobs: {
        totalAvailable: number;
        newJobsToday: number;
        matchingJobs: number;
        averageMatchScore: number;
    };
    applications: {
        applied: number;
        interview: number;
        offered: number;
        rejected: number;
        successRate: number;
    };
    recommendations: {
        topMatches: Array<{
            jobId: string;
            title: string;
            company: string;
            score: number;
            matchReasons: string[];
        }>;
        skillsInDemand: string[];
        suggestedLocations: string[];
    };
}

export interface DashboardActivity {
    type: 'application' | 'job_match' | 'status_update';
    timestamp: string;
    description: string;
    jobTitle?: string;
    company?: string;
    status?: string;
}

export interface UpcomingInterview {
    applicationId: string;
    jobTitle: string;
    company: string;
    interviewDate: string;
    status: string;
}

export interface DashboardData {
    stats: DashboardStats;
    recentActivity: DashboardActivity[];
    upcomingInterviews: UpcomingInterview[];
}

export interface UserMetrics {
    profileCompleteness: number;
    applicationVelocity: number;
    responseRate: number;
    averageTimeToInterview: number;
    topMatchingSkills: string[];
}

// Dashboard API endpoints
export const dashboardApi = {
    getDashboardData: (): Promise<AxiosResponse<DashboardData>> =>
        apiClient.get('/dashboard'),

    getDashboardStats: (): Promise<AxiosResponse<DashboardStats>> =>
        apiClient.get('/dashboard/stats'),

    getRecentActivity: (limit?: number): Promise<AxiosResponse<DashboardActivity[]>> =>
        apiClient.get('/dashboard/activity', { params: limit ? { limit } : {} }),

    getUpcomingInterviews: (): Promise<AxiosResponse<UpcomingInterview[]>> =>
        apiClient.get('/dashboard/interviews'),

    refreshRecommendations: (): Promise<AxiosResponse<{ message: string }>> =>
        apiClient.post('/dashboard/refresh-recommendations'),

    getUserMetrics: (): Promise<AxiosResponse<UserMetrics>> =>
        apiClient.get('/dashboard/metrics'),

    getJobRecommendations: (limit?: number): Promise<AxiosResponse<JobMatch[]>> =>
        apiClient.get('/dashboard/recommendations', { params: limit ? { limit } : {} }),
};

export default apiClient;