import { User, UserProfile, Job, Application } from '../../types/database';

export const mockUsers = {
    user1: {
        id: 'user-1',
        email: 'test1@example.com',
        passwordHash: '$2b$12$hashedpassword1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    } as User,

    user2: {
        id: 'user-2',
        email: 'test2@example.com',
        passwordHash: '$2b$12$hashedpassword2',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
    } as User,
};

export const mockProfiles = {
    profile1: {
        id: 'profile-1',
        userId: 'user-1',
        name: 'John Doe',
        age: 28,
        location: 'San Francisco, CA',
        resumeId: 'resume-1',
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceLevel: 'mid' as const,
        preferences: {
            locations: ['San Francisco, CA', 'Remote'],
            experienceLevels: ['mid', 'senior'],
            keywords: ['frontend', 'fullstack'],
            remoteWork: true,
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    } as UserProfile,

    profile2: {
        id: 'profile-2',
        userId: 'user-2',
        name: 'Jane Smith',
        age: 32,
        location: 'New York, NY',
        resumeId: 'resume-2',
        skills: ['Python', 'Django', 'PostgreSQL'],
        experienceLevel: 'senior' as const,
        preferences: {
            locations: ['New York, NY', 'Boston, MA'],
            experienceLevels: ['senior', 'lead'],
            keywords: ['backend', 'api'],
            remoteWork: false,
        },
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
    } as UserProfile,
};

export const mockJobs = {
    job1: {
        id: 'job-1',
        title: 'Frontend Developer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        description: 'Build amazing user interfaces with React',
        requirements: ['React', 'JavaScript', '2+ years experience'],
        experienceLevel: 'mid' as const,
        applicationUrl: 'https://techcorp.com/jobs/frontend-dev',
        isAvailable: true,
        crawledAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    } as Job,

    job2: {
        id: 'job-2',
        title: 'Backend Engineer',
        company: 'DataFlow',
        location: 'New York, NY',
        description: 'Design and build scalable APIs',
        requirements: ['Python', 'Django', '3+ years experience'],
        experienceLevel: 'senior' as const,
        applicationUrl: 'https://dataflow.com/careers/backend-engineer',
        isAvailable: true,
        crawledAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
    } as Job,

    job3: {
        id: 'job-3',
        title: 'Full Stack Developer',
        company: 'StartupXYZ',
        location: 'Remote',
        description: 'Work on both frontend and backend systems',
        requirements: ['JavaScript', 'Node.js', 'React', '1+ years experience'],
        experienceLevel: 'entry' as const,
        applicationUrl: 'https://startupxyz.com/jobs/fullstack',
        isAvailable: false,
        crawledAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
    } as Job,
};

export const mockApplications = {
    app1: {
        id: 'app-1',
        userId: 'user-1',
        jobId: 'job-1',
        status: 'applied' as const,
        appliedAt: new Date('2024-01-05'),
        coverLetter: 'Dear Hiring Manager, I am excited to apply...',
        notes: 'Applied through company website',
        interviewDate: null,
    } as Application,

    app2: {
        id: 'app-2',
        userId: 'user-1',
        jobId: 'job-2',
        status: 'interview' as const,
        appliedAt: new Date('2024-01-06'),
        coverLetter: 'Dear Team, I would love to join...',
        notes: 'Phone screening scheduled',
        interviewDate: new Date('2024-01-15'),
    } as Application,
};

export const mockLLMResponses = {
    resumeParsing: {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        experience: [
            {
                company: 'Previous Corp',
                title: 'Software Developer',
                duration: '2021-2023',
                description: 'Developed web applications using React and Node.js',
            },
        ],
        education: [
            {
                institution: 'University of Technology',
                degree: 'Bachelor of Computer Science',
                year: '2021',
            },
        ],
        skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    },

    coverLetter: `Dear Hiring Manager,

I am writing to express my strong interest in the Frontend Developer position at TechCorp. With my experience in React and JavaScript development, I am confident I would be a valuable addition to your team.

In my previous role at Previous Corp, I successfully developed and maintained multiple web applications using React, which directly aligns with your requirements. My passion for creating intuitive user interfaces and my collaborative approach to development make me an ideal candidate for this position.

I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to TechCorp's continued success.

Best regards,
John Doe`,
};

export const mockJobScrapingData = [
    {
        title: 'Senior React Developer',
        company: 'InnovaTech',
        location: 'Seattle, WA',
        description: 'Join our team to build next-generation web applications',
        requirements: ['React', 'TypeScript', '5+ years experience'],
        applicationUrl: 'https://innovatech.com/careers/senior-react-dev',
    },
    {
        title: 'DevOps Engineer',
        company: 'CloudFirst',
        location: 'Austin, TX',
        description: 'Manage cloud infrastructure and deployment pipelines',
        requirements: ['AWS', 'Docker', 'Kubernetes', '3+ years experience'],
        applicationUrl: 'https://cloudfirst.com/jobs/devops-engineer',
    },
];

export function createMockUser(overrides: Partial<User> = {}): User {
    return {
        ...mockUsers.user1,
        ...overrides,
    };
}

export function createMockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        ...mockProfiles.profile1,
        ...overrides,
    };
}

export function createMockJob(overrides: Partial<Job> = {}): Job {
    return {
        ...mockJobs.job1,
        ...overrides,
    };
}

export function createMockApplication(overrides: Partial<Application> = {}): Application {
    return {
        ...mockApplications.app1,
        ...overrides,
    };
}