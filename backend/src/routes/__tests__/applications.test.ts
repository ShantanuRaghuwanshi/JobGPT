import request from 'supertest';
import express from 'express';
import { Application, ApplicationStatus, StatusChange } from '../../types/database';

// Mock dependencies
const mockApplicationStatusService = {
    updateApplicationStatus: jest.fn(),
    getApplicationStatusHistory: jest.fn(),
    addApplicationNotes: jest.fn(),
    updateInterviewDate: jest.fn(),
    getApplicationsByStatus: jest.fn(),
    getApplicationStatistics: jest.fn(),
    getValidNextStatuses: jest.fn(),
};

const mockApplicationRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIdAndStatus: jest.fn(),
    findByUserIdAndJobId: jest.fn(),
    createApplication: jest.fn(),
    updateStatus: jest.fn(),
    updateInterviewDate: jest.fn(),
    addNotes: jest.fn(),
    getApplicationStats: jest.fn(),
    getStatusHistory: jest.fn(),
    applicationExists: jest.fn(),
};

jest.mock('../../services/applicationStatus', () => ({
    ApplicationStatusService: jest.fn().mockImplementation(() => mockApplicationStatusService),
}));

jest.mock('../../database/repositories/application', () => ({
    ApplicationRepository: jest.fn().mockImplementation(() => mockApplicationRepository),
}));

jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'user-123', email: 'test@example.com' };
        next();
    },
}));

// Import the router after mocking
import applicationsRouter from '../applications';

describe('Applications Routes', () => {
    let app: express.Application;

    const mockUserId = 'user-123';
    const mockApplicationId = '550e8400-e29b-41d4-a716-446655440000';
    const mockJobId = 'job-123';

    const mockApplication: Application = {
        id: mockApplicationId,
        userId: mockUserId,
        jobId: mockJobId,
        status: 'applied',
        appliedAt: new Date('2024-01-01'),
        coverLetter: 'Test cover letter',
        notes: 'Initial notes',
        interviewDate: undefined,
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/applications', applicationsRouter);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/applications', () => {
        it('should return all applications for user', async () => {
            const mockApplications = [mockApplication];
            mockApplicationStatusService.getApplicationsByStatus.mockResolvedValue(mockApplications);

            const response = await request(app)
                .get('/api/applications')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    applications: mockApplications,
                    count: 1,
                    status: 'all'
                }
            });

            expect(mockApplicationStatusService.getApplicationsByStatus).toHaveBeenCalledWith(
                mockUserId,
                undefined
            );
        });

        it('should return applications filtered by status', async () => {
            const mockApplications = [mockApplication];
            mockApplicationStatusService.getApplicationsByStatus.mockResolvedValue(mockApplications);

            const response = await request(app)
                .get('/api/applications?status=applied')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    applications: mockApplications,
                    count: 1,
                    status: 'applied'
                }
            });

            expect(mockApplicationStatusService.getApplicationsByStatus).toHaveBeenCalledWith(
                mockUserId,
                'applied'
            );
        });

        it('should return 400 for invalid status filter', async () => {
            const response = await request(app)
                .get('/api/applications?status=invalid')
                .expect(400);

            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should handle service errors', async () => {
            mockApplicationStatusService.getApplicationsByStatus.mockRejectedValue(
                new Error('Database error')
            );

            const response = await request(app)
                .get('/api/applications')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/applications/stats', () => {
        it('should return application statistics', async () => {
            const mockStats = {
                total: 10,
                applied: 5,
                interview: 3,
                offered: 1,
                rejected: 1,
            };

            mockApplicationStatusService.getApplicationStatistics.mockResolvedValue(mockStats);

            const response = await request(app)
                .get('/api/applications/stats')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockStats
            });

            expect(mockApplicationStatusService.getApplicationStatistics).toHaveBeenCalledWith(mockUserId);
        });

        it('should handle service errors', async () => {
            mockApplicationStatusService.getApplicationStatistics.mockRejectedValue(
                new Error('Database error')
            );

            const response = await request(app)
                .get('/api/applications/stats')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/applications/:id', () => {
        it('should return specific application', async () => {
            mockApplicationRepository.findById.mockResolvedValue(mockApplication);

            const response = await request(app)
                .get(`/api/applications/${mockApplicationId}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockApplication
            });

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
        });

        it('should return 404 when application not found', async () => {
            mockApplicationRepository.findById.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/applications/${mockApplicationId}`)
                .expect(404);

            expect(response.body.error).toBe('Application not found');
        });

        it('should return 403 when user does not own application', async () => {
            const otherUserApplication = { ...mockApplication, userId: 'other-user' };
            mockApplicationRepository.findById.mockResolvedValue(otherUserApplication);

            const response = await request(app)
                .get(`/api/applications/${mockApplicationId}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
        });

        it('should return 400 for invalid application ID', async () => {
            const response = await request(app)
                .get('/api/applications/invalid-id')
                .expect(400);

            expect(response.body.error).toBe('Invalid application ID');
        });
    });

    describe('PUT /api/applications/:id/status', () => {
        it('should successfully update application status', async () => {
            const updatedApplication = { ...mockApplication, status: 'interview' as ApplicationStatus };
            mockApplicationStatusService.updateApplicationStatus.mockResolvedValue(updatedApplication);

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/status`)
                .send({
                    status: 'interview',
                    notes: 'Interview scheduled',
                    interviewDate: '2024-01-15T10:00:00.000Z'
                })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: updatedApplication,
                message: 'Application status updated to interview'
            });

            expect(mockApplicationStatusService.updateApplicationStatus).toHaveBeenCalledWith(
                mockApplicationId,
                mockUserId,
                {
                    status: 'interview',
                    notes: 'Interview scheduled',
                    interviewDate: new Date('2024-01-15T10:00:00.000Z')
                }
            );
        });

        it('should return 400 for invalid status', async () => {
            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/status`)
                .send({ status: 'invalid' })
                .expect(400);

            expect(response.body.error).toBe('Invalid request body');
        });

        it('should return 400 for invalid status transition', async () => {
            mockApplicationStatusService.updateApplicationStatus.mockRejectedValue(
                new Error('Invalid status transition from \'applied\' to \'offered\'')
            );

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/status`)
                .send({ status: 'offered' })
                .expect(400);

            expect(response.body.error).toBe('Invalid status transition');
        });

        it('should return 404 when application not found', async () => {
            mockApplicationStatusService.updateApplicationStatus.mockRejectedValue(
                new Error('Application not found')
            );

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/status`)
                .send({ status: 'interview' })
                .expect(404);

            expect(response.body.error).toBe('Application not found');
        });

        it('should return 403 for unauthorized access', async () => {
            mockApplicationStatusService.updateApplicationStatus.mockRejectedValue(
                new Error('Unauthorized: Application does not belong to user')
            );

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/status`)
                .send({ status: 'interview' })
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
        });
    });

    describe('GET /api/applications/:id/history', () => {
        it('should return application status history', async () => {
            const mockHistory: StatusChange[] = [
                {
                    id: 'change-1',
                    applicationId: mockApplicationId,
                    fromStatus: undefined,
                    toStatus: 'applied',
                    changedAt: new Date('2024-01-01'),
                    notes: 'Initial application',
                },
                {
                    id: 'change-2',
                    applicationId: mockApplicationId,
                    fromStatus: 'applied',
                    toStatus: 'interview',
                    changedAt: new Date('2024-01-10'),
                    notes: 'Interview scheduled',
                },
            ];

            mockApplicationStatusService.getApplicationStatusHistory.mockResolvedValue(mockHistory);

            const response = await request(app)
                .get(`/api/applications/${mockApplicationId}/history`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    applicationId: mockApplicationId,
                    history: mockHistory
                }
            });

            expect(mockApplicationStatusService.getApplicationStatusHistory).toHaveBeenCalledWith(
                mockApplicationId,
                mockUserId
            );
        });

        it('should return 404 when application not found', async () => {
            mockApplicationStatusService.getApplicationStatusHistory.mockRejectedValue(
                new Error('Application not found')
            );

            const response = await request(app)
                .get(`/api/applications/${mockApplicationId}/history`)
                .expect(404);

            expect(response.body.error).toBe('Application not found');
        });
    });

    describe('PUT /api/applications/:id/notes', () => {
        it('should successfully add notes to application', async () => {
            const updatedApplication = { ...mockApplication, notes: 'Updated notes' };
            mockApplicationStatusService.addApplicationNotes.mockResolvedValue(updatedApplication);

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/notes`)
                .send({ notes: 'Updated notes' })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: updatedApplication,
                message: 'Application notes updated'
            });

            expect(mockApplicationStatusService.addApplicationNotes).toHaveBeenCalledWith(
                mockApplicationId,
                mockUserId,
                'Updated notes'
            );
        });

        it('should return 400 for missing notes', async () => {
            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/notes`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Invalid request body');
        });
    });

    describe('PUT /api/applications/:id/interview-date', () => {
        it('should successfully update interview date', async () => {
            const interviewDate = new Date('2024-01-20T14:00:00.000Z');
            const updatedApplication = { ...mockApplication, interviewDate };
            mockApplicationStatusService.updateInterviewDate.mockResolvedValue(updatedApplication);

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/interview-date`)
                .send({ interviewDate: '2024-01-20T14:00:00.000Z' })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: updatedApplication,
                message: 'Interview date updated'
            });

            expect(mockApplicationStatusService.updateInterviewDate).toHaveBeenCalledWith(
                mockApplicationId,
                mockUserId,
                interviewDate
            );
        });

        it('should return 400 for invalid interview date format', async () => {
            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/interview-date`)
                .send({ interviewDate: 'invalid-date' })
                .expect(400);

            expect(response.body.error).toBe('Invalid request body');
        });

        it('should return 400 when application is not in interview status', async () => {
            mockApplicationStatusService.updateInterviewDate.mockRejectedValue(
                new Error('Can only set interview date for applications in interview status')
            );

            const response = await request(app)
                .put(`/api/applications/${mockApplicationId}/interview-date`)
                .send({ interviewDate: '2024-01-20T14:00:00.000Z' })
                .expect(400);

            expect(response.body.error).toBe('Invalid operation');
        });
    });

    describe('GET /api/applications/status/:status/valid-transitions', () => {
        it('should return valid transitions for applied status', async () => {
            mockApplicationStatusService.getValidNextStatuses.mockReturnValue(['interview', 'rejected']);

            const response = await request(app)
                .get('/api/applications/status/applied/valid-transitions')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    currentStatus: 'applied',
                    validTransitions: ['interview', 'rejected']
                }
            });

            expect(mockApplicationStatusService.getValidNextStatuses).toHaveBeenCalledWith('applied');
        });

        it('should return 400 for invalid status', async () => {
            const response = await request(app)
                .get('/api/applications/status/invalid/valid-transitions')
                .expect(400);

            expect(response.body.error).toBe('Invalid status');
        });
    });
});