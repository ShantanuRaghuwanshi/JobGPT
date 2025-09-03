import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../dashboard';

// Mock all dependencies
jest.mock('../../services/dashboardService');
jest.mock('../../services/jobService');
jest.mock('../../services/applicationStatus');
jest.mock('../../services/jobMatching');
jest.mock('../../database/repositories/userProfile');
jest.mock('../../database/repositories/application');
jest.mock('../../database/repositories/job');
jest.mock('../../middleware/auth');
jest.mock('../../config/logger');

// Mock the auth middleware to always authenticate
jest.mock('../../middleware/auth', () => ({
    authenticateToken: jest.fn((req: any, res: any, next: any) => {
        req.user = { userId: 'user-123', email: 'test@example.com' };
        next();
    })
}));

describe('Dashboard Routes', () => {
    let app: express.Application;

    const mockDashboardData = {
        stats: {
            user: {
                profileComplete: true,
                totalApplications: 10,
                activeApplications: 8,
                interviewsScheduled: 3,
                offersReceived: 1
            },
            jobs: {
                totalAvailable: 800,
                newJobsToday: 50,
                matchingJobs: 25,
                averageMatchScore: 65.5
            },
            applications: {
                applied: 5,
                interview: 3,
                offered: 1,
                rejected: 1,
                successRate: 10
            },
            recommendations: {
                topMatches: [],
                skillsInDemand: ['JavaScript', 'React'],
                suggestedLocations: ['San Francisco', 'Remote']
            }
        },
        recentActivity: [
            {
                type: 'application',
                timestamp: new Date('2024-01-15'),
                description: 'Applied to Frontend Developer at Tech Corp',
                jobTitle: 'Frontend Developer',
                company: 'Tech Corp',
                status: 'applied'
            }
        ],
        upcomingInterviews: [
            {
                applicationId: 'app-1',
                jobTitle: 'Frontend Developer',
                company: 'Tech Corp',
                interviewDate: new Date('2024-01-20'),
                status: 'interview'
            }
        ]
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/dashboard', dashboardRoutes);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/dashboard', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard')
                .expect(200);

            // Just verify the route is accessible and returns JSON
            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/dashboard/stats', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard/stats')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/dashboard/activity', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard/activity')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should handle limit parameter', async () => {
            await request(app)
                .get('/api/dashboard/activity?limit=5')
                .expect(200);
        });
    });

    describe('GET /api/dashboard/interviews', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard/interviews')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('POST /api/dashboard/refresh-recommendations', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .post('/api/dashboard/refresh-recommendations')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/dashboard/metrics', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard/metrics')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/dashboard/recommendations', () => {
        it('should return 200 status', async () => {
            const response = await request(app)
                .get('/api/dashboard/recommendations')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should handle limit parameter', async () => {
            await request(app)
                .get('/api/dashboard/recommendations?limit=5')
                .expect(200);
        });
    });
});