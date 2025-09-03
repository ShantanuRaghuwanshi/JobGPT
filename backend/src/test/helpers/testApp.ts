import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import authRoutes from '../../routes/auth';
import jobRoutes from '../../routes/jobs';
import profileRoutes from '../../routes/profile';
import applicationRoutes from '../../routes/applications';
import pipelineRoutes from '../../routes/pipeline';
import dashboardRoutes from '../../routes/dashboard';

export async function createTestApp(): Promise<Express> {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/applications', applicationRoutes);
    app.use('/api/pipeline', pipelineRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

export function createMockUser() {
    return {
        id: 'test-user-id',
        email: 'test@example.com',
        profile: {
            id: 'test-profile-id',
            userId: 'test-user-id',
            name: 'Test User',
            location: 'San Francisco, CA',
            skills: ['JavaScript', 'TypeScript', 'React'],
            experienceLevel: 'mid' as const,
            preferences: {
                locations: ['San Francisco, CA', 'Remote'],
                experienceLevels: ['mid', 'senior'],
                jobTypes: ['full-time']
            }
        }
    };
}

export function createMockJob() {
    return {
        id: 'test-job-id',
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        description: 'Great opportunity for a software engineer',
        requirements: ['JavaScript', 'React', '3+ years experience'],
        experienceLevel: 'mid' as const,
        applicationUrl: 'https://techcorp.com/jobs/123',
        isAvailable: true,
        crawledAt: new Date(),
        updatedAt: new Date()
    };
}

export function createMockApplication() {
    return {
        id: 'test-application-id',
        userId: 'test-user-id',
        jobId: 'test-job-id',
        status: 'applied' as const,
        appliedAt: new Date(),
        coverLetter: 'Dear Hiring Manager...',
        notes: 'Applied through company website',
        statusHistory: []
    };
}