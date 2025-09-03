import request from 'supertest';
import express from 'express';
import { Job } from '../../types/database';

// Mock the services before importing the router
const mockJobService = {
    getJobs: jest.fn(),
    getJobById: jest.fn(),
    searchJobs: jest.fn(),
    markJobUnavailable: jest.fn(),
    markJobAvailable: jest.fn(),
    getJobStats: jest.fn(),
    getJobsByCompany: jest.fn(),
    getJobsByExperienceLevel: jest.fn(),
    getJobsByLocation: jest.fn(),
};

jest.mock('../../services/jobService', () => ({
    JobService: jest.fn().mockImplementation(() => mockJobService)
}));

jest.mock('../../database/repositories/job', () => ({
    JobRepository: jest.fn().mockImplementation(() => ({}))
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'user123', email: 'test@example.com' };
        next();
    }
}));

// Mock logger
jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Import the router after mocking
import jobsRouter from '../jobs';

describe('Jobs Routes', () => {
    let app: express.Application;

    const mockJob: Job = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Great software engineering position',
        requirements: ['JavaScript', 'React', 'Node.js'],
        experienceLevel: 'mid',
        applicationUrl: 'https://techcorp.com/jobs/123',
        isAvailable: true,
        crawledAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    const mockJobSerialized = {
        ...mockJob,
        crawledAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/jobs', jobsRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/jobs', () => {
        it('should return jobs with pagination', async () => {
            const mockResult = {
                jobs: [mockJob],
                total: 1,
                hasMore: false
            };

            mockJobService.getJobs.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/jobs')
                .query({ title: 'Software', limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    jobs: [mockJobSerialized],
                    pagination: {
                        total: 1,
                        limit: 10,
                        offset: 0,
                        hasMore: false
                    }
                }
            });
        });

        it('should validate query parameters', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .query({ limit: 'invalid' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should handle service errors', async () => {
            mockJobService.getJobs.mockRejectedValue(new Error('Service error'));

            const response = await request(app).get('/api/jobs');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/jobs/search', () => {
        it('should search jobs by query', async () => {
            const mockResult = {
                jobs: [mockJob],
                total: 1,
                hasMore: false
            };

            mockJobService.searchJobs.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/jobs/search')
                .query({ q: 'Software Engineer' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    jobs: [mockJobSerialized],
                    query: 'Software Engineer',
                    pagination: {
                        total: 1,
                        limit: 20,
                        offset: 0,
                        hasMore: false
                    }
                }
            });

            expect(mockJobService.searchJobs).toHaveBeenCalledWith('Software Engineer', {
                limit: 20,
                offset: 0
            });
        });

        it('should require search query', async () => {
            const response = await request(app).get('/api/jobs/search');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid search parameters');
        });

        it('should validate search query length', async () => {
            const response = await request(app)
                .get('/api/jobs/search')
                .query({ q: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid search parameters');
        });
    });

    describe('GET /api/jobs/stats', () => {
        it('should return job statistics', async () => {
            const mockStats = {
                total: 100,
                available: 80,
                unavailable: 20,
                byExperienceLevel: {
                    entry: 10,
                    mid: 40,
                    senior: 35,
                    lead: 15
                },
                recentlyAdded: 5
            };

            mockJobService.getJobStats.mockResolvedValue(mockStats);

            const response = await request(app).get('/api/jobs/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockStats
            });
        });

        it('should handle service errors', async () => {
            mockJobService.getJobStats.mockRejectedValue(new Error('Service error'));

            const response = await request(app).get('/api/jobs/stats');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/jobs/companies/:company', () => {
        it('should return jobs by company', async () => {
            const mockResult = {
                jobs: [mockJob],
                total: 1,
                hasMore: false
            };

            mockJobService.getJobsByCompany.mockResolvedValue(mockResult);

            const response = await request(app).get('/api/jobs/companies/Tech%20Corp');

            expect(response.status).toBe(200);
            expect(response.body.data.company).toBe('Tech Corp');
            expect(mockJobService.getJobsByCompany).toHaveBeenCalledWith('Tech Corp', expect.any(Object));
        });
    });

    describe('GET /api/jobs/experience/:level', () => {
        it('should return jobs by experience level', async () => {
            const mockResult = {
                jobs: [mockJob],
                total: 1,
                hasMore: false
            };

            mockJobService.getJobsByExperienceLevel.mockResolvedValue(mockResult);

            const response = await request(app).get('/api/jobs/experience/mid');

            expect(response.status).toBe(200);
            expect(response.body.data.experienceLevel).toBe('mid');
            expect(mockJobService.getJobsByExperienceLevel).toHaveBeenCalledWith('mid', expect.any(Object));
        });

        it('should validate experience level', async () => {
            const response = await request(app).get('/api/jobs/experience/invalid');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid experience level');
        });
    });

    describe('GET /api/jobs/:id', () => {
        it('should return job by ID', async () => {
            mockJobService.getJobById.mockResolvedValue(mockJob);

            const response = await request(app).get(`/api/jobs/${mockJob.id}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockJobSerialized
            });
        });

        it('should return 404 when job not found', async () => {
            mockJobService.getJobById.mockResolvedValue(null);

            const response = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Job not found');
        });

        it('should validate job ID format', async () => {
            const response = await request(app).get('/api/jobs/invalid-id');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid job ID');
        });
    });

    describe('PUT /api/jobs/:id/status', () => {
        it('should mark job as unavailable', async () => {
            const updatedJob = { ...mockJob, isAvailable: false };
            const updatedJobSerialized = { ...mockJobSerialized, isAvailable: false };
            mockJobService.markJobUnavailable.mockResolvedValue(updatedJob);

            const response = await request(app)
                .put(`/api/jobs/${mockJob.id}/status`)
                .send({ isAvailable: false });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: updatedJobSerialized,
                message: 'Job marked as unavailable'
            });
        });

        it('should mark job as available', async () => {
            const updatedJob = { ...mockJob, isAvailable: true };
            const updatedJobSerialized = { ...mockJobSerialized, isAvailable: true };
            mockJobService.markJobAvailable.mockResolvedValue(updatedJob);

            const response = await request(app)
                .put(`/api/jobs/${mockJob.id}/status`)
                .send({ isAvailable: true });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: updatedJobSerialized,
                message: 'Job marked as available'
            });
        });

        it('should return 404 when job not found', async () => {
            mockJobService.markJobUnavailable.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/jobs/123e4567-e89b-12d3-a456-426614174000/status')
                .send({ isAvailable: false });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Job not found');
        });

        it('should validate request body', async () => {
            const response = await request(app)
                .put(`/api/jobs/${mockJob.id}/status`)
                .send({ isAvailable: 'invalid' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid request body');
        });

        it('should validate job ID format', async () => {
            const response = await request(app)
                .put('/api/jobs/invalid-id/status')
                .send({ isAvailable: false });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid job ID');
        });
    });
});