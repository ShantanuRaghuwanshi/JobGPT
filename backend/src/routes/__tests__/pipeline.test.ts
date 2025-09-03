import request from 'supertest';
import express from 'express';
import pipelineRoutes from '../pipeline';
import { PipelineService } from '../../services/pipelineService';
import { authenticateToken } from '../../middleware/auth';

// Mock the services and middleware
jest.mock('../../services/pipelineService');
jest.mock('../../services/applicationStatus');
jest.mock('../../database/repositories/application');
jest.mock('../../database/repositories/job');
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/pipeline', pipelineRoutes);

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const MockPipelineService = PipelineService as jest.MockedClass<typeof PipelineService>;

describe('Pipeline Routes', () => {
    let mockPipelineService: jest.Mocked<PipelineService>;
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock authentication middleware
        mockAuthenticateToken.mockImplementation(async (req: any, res, next) => {
            req.user = { id: mockUserId };
            next();
        });

        // Create mock service instance
        mockPipelineService = {
            getPipelineData: jest.fn(),
            getPipelineStats: jest.fn(),
            handleDragDrop: jest.fn(),
            getValidDropTargets: jest.fn()
        } as any;
    });

    describe('GET /api/pipeline', () => {
        it('should return pipeline data successfully', async () => {
            const mockPipelineData = {
                columns: [
                    {
                        id: 'available',
                        title: 'Available Jobs',
                        status: 'available' as const,
                        jobs: []
                    },
                    {
                        id: 'applied',
                        title: 'Applied',
                        status: 'applied' as const,
                        jobs: []
                    }
                ],
                totalJobs: 0
            };

            mockPipelineService.getPipelineData.mockResolvedValue(mockPipelineData);

            const response = await request(app)
                .get('/api/pipeline')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockPipelineData
            });

            expect(mockPipelineService.getPipelineData).toHaveBeenCalledWith(mockUserId, 50);
        });

        it('should handle custom limit parameter', async () => {
            const mockPipelineData = {
                columns: [],
                totalJobs: 0
            };

            mockPipelineService.getPipelineData.mockResolvedValue(mockPipelineData);

            await request(app)
                .get('/api/pipeline?limit=100')
                .expect(200);

            expect(mockPipelineService.getPipelineData).toHaveBeenCalledWith(mockUserId, 100);
        });

        it('should return 400 for invalid limit parameter', async () => {
            const response = await request(app)
                .get('/api/pipeline?limit=invalid')
                .expect(400);

            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should return 500 on service error', async () => {
            mockPipelineService.getPipelineData.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .get('/api/pipeline')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/pipeline/stats', () => {
        it('should return pipeline statistics successfully', async () => {
            const mockStats = {
                available: 10,
                applied: 5,
                interview: 2,
                offered: 1,
                rejected: 3
            };

            mockPipelineService.getPipelineStats.mockResolvedValue(mockStats);

            const response = await request(app)
                .get('/api/pipeline/stats')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockStats
            });

            expect(mockPipelineService.getPipelineStats).toHaveBeenCalledWith(mockUserId);
        });

        it('should return 500 on service error', async () => {
            mockPipelineService.getPipelineStats.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .get('/api/pipeline/stats')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('POST /api/pipeline/drag-drop', () => {
        const validDragDropRequest = {
            jobId: 'job-123',
            fromColumn: 'available',
            toColumn: 'applied'
        };

        it('should handle drag drop successfully', async () => {
            const mockResult = {
                success: true,
                updatedApplication: {
                    id: 'app-123',
                    userId: mockUserId,
                    jobId: 'job-123',
                    status: 'applied' as const,
                    appliedAt: new Date(),
                    coverLetter: undefined,
                    notes: undefined,
                    interviewDate: undefined
                },
                message: 'Application created successfully'
            };

            mockPipelineService.handleDragDrop.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockResult.updatedApplication,
                message: mockResult.message
            });

            expect(mockPipelineService.handleDragDrop).toHaveBeenCalledWith(mockUserId, validDragDropRequest);
        });

        it('should return 400 for invalid request body', async () => {
            const invalidRequest = {
                jobId: 'invalid-uuid',
                fromColumn: 'invalid',
                toColumn: 'applied'
            };

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(invalidRequest)
                .expect(400);

            expect(response.body.error).toBe('Invalid request body');
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteRequest = {
                jobId: 'job-123'
                // missing fromColumn and toColumn
            };

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(incompleteRequest)
                .expect(400);

            expect(response.body.error).toBe('Invalid request body');
        });

        it('should return 400 for invalid column error', async () => {
            mockPipelineService.handleDragDrop.mockRejectedValue(new Error('Invalid column specified'));

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(400);

            expect(response.body.error).toBe('Invalid column');
        });

        it('should return 409 for application already exists error', async () => {
            mockPipelineService.handleDragDrop.mockRejectedValue(new Error('Application already exists for this job'));

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(409);

            expect(response.body.error).toBe('Conflict');
        });

        it('should return 404 for not found error', async () => {
            mockPipelineService.handleDragDrop.mockRejectedValue(new Error('Application not found'));

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(404);

            expect(response.body.error).toBe('Not found');
        });

        it('should return 400 for invalid operation error', async () => {
            mockPipelineService.handleDragDrop.mockRejectedValue(new Error('Can only apply to jobs from available column'));

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(400);

            expect(response.body.error).toBe('Invalid operation');
        });

        it('should return 500 for unexpected errors', async () => {
            mockPipelineService.handleDragDrop.mockRejectedValue(new Error('Unexpected error'));

            const response = await request(app)
                .post('/api/pipeline/drag-drop')
                .send(validDragDropRequest)
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('GET /api/pipeline/valid-drop-targets', () => {
        it('should return valid drop targets successfully', async () => {
            const mockTargets = ['applied'];

            mockPipelineService.getValidDropTargets.mockResolvedValue(mockTargets);

            const response = await request(app)
                .get('/api/pipeline/valid-drop-targets?jobId=job-123&currentColumn=available')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: {
                    jobId: 'job-123',
                    currentColumn: 'available',
                    validDropTargets: mockTargets
                }
            });

            expect(mockPipelineService.getValidDropTargets).toHaveBeenCalledWith(mockUserId, 'job-123', 'available');
        });

        it('should return 400 for invalid query parameters', async () => {
            const response = await request(app)
                .get('/api/pipeline/valid-drop-targets?jobId=invalid-uuid&currentColumn=invalid')
                .expect(400);

            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should return 400 for missing required parameters', async () => {
            const response = await request(app)
                .get('/api/pipeline/valid-drop-targets?jobId=job-123')
                .expect(400);

            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should return 500 on service error', async () => {
            mockPipelineService.getValidDropTargets.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .get('/api/pipeline/valid-drop-targets?jobId=job-123&currentColumn=available')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('POST /api/pipeline/refresh', () => {
        it('should refresh pipeline data successfully', async () => {
            const mockPipelineData = {
                columns: [],
                totalJobs: 0
            };

            mockPipelineService.getPipelineData.mockResolvedValue(mockPipelineData);

            const response = await request(app)
                .post('/api/pipeline/refresh')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockPipelineData,
                message: 'Pipeline data refreshed'
            });

            expect(mockPipelineService.getPipelineData).toHaveBeenCalledWith(mockUserId);
        });

        it('should return 500 on service error', async () => {
            mockPipelineService.getPipelineData.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .post('/api/pipeline/refresh')
                .expect(500);

            expect(response.body.error).toBe('Internal server error');
        });
    });
});