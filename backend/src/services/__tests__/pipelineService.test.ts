import { PipelineService, DragDropRequest } from '../pipelineService';
import { ApplicationStatusService } from '../applicationStatus';
import { ApplicationRepository } from '../../database/repositories/application';
import { JobRepository } from '../../database/repositories/job';
import { Application, Job, ApplicationStatus } from '../../types/database';

// Mock the repositories and services
jest.mock('../../database/repositories/application');
jest.mock('../../database/repositories/job');
jest.mock('../applicationStatus');

describe('PipelineService', () => {
    let pipelineService: PipelineService;
    let mockApplicationRepository: jest.Mocked<ApplicationRepository>;
    let mockJobRepository: jest.Mocked<JobRepository>;
    let mockApplicationStatusService: jest.Mocked<ApplicationStatusService>;

    const mockUserId = 'user-123';
    const mockJobId = 'job-123';
    const mockApplicationId = 'app-123';

    const mockJob: Job = {
        id: mockJobId,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Great job opportunity',
        requirements: ['JavaScript', 'React'],
        experienceLevel: 'mid',
        applicationUrl: 'https://example.com/apply',
        isAvailable: true,
        crawledAt: new Date(),
        updatedAt: new Date()
    };

    const mockApplication: Application = {
        id: mockApplicationId,
        userId: mockUserId,
        jobId: mockJobId,
        status: 'applied',
        appliedAt: new Date(),
        coverLetter: undefined,
        notes: undefined,
        interviewDate: undefined
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockApplicationRepository = new ApplicationRepository() as jest.Mocked<ApplicationRepository>;
        mockJobRepository = new JobRepository() as jest.Mocked<JobRepository>;
        mockApplicationStatusService = new ApplicationStatusService(mockApplicationRepository) as jest.Mocked<ApplicationStatusService>;

        // Add missing methods to job repository mock
        (mockJobRepository as any).getAvailableJobsNotAppliedTo = jest.fn();
        (mockJobRepository as any).findByIds = jest.fn();

        // Create service instance
        pipelineService = new PipelineService(
            mockApplicationRepository,
            mockJobRepository,
            mockApplicationStatusService
        );
    });

    describe('getPipelineData', () => {
        it('should return pipeline data with jobs organized by columns', async () => {
            // Mock repository responses
            mockApplicationRepository.findByUserId.mockResolvedValue([mockApplication]);
            (mockJobRepository as any).getAvailableJobsNotAppliedTo.mockResolvedValue([mockJob]);
            (mockJobRepository as any).findByIds.mockResolvedValue([mockJob]);

            const result = await pipelineService.getPipelineData(mockUserId);

            expect(result).toHaveProperty('columns');
            expect(result).toHaveProperty('totalJobs');
            expect(result.columns).toHaveLength(4);
            expect(result.columns[0].id).toBe('available');
            expect(result.columns[1].id).toBe('applied');
            expect(result.columns[2].id).toBe('interview');
            expect(result.columns[3].id).toBe('offered');
        });

        it('should handle empty data correctly', async () => {
            mockApplicationRepository.findByUserId.mockResolvedValue([]);
            (mockJobRepository as any).getAvailableJobsNotAppliedTo.mockResolvedValue([]);
            (mockJobRepository as any).findByIds.mockResolvedValue([]);

            const result = await pipelineService.getPipelineData(mockUserId);

            expect(result.totalJobs).toBe(0);
            expect(result.columns.every(col => col.jobs.length === 0)).toBe(true);
        });
    });

    describe('handleDragDrop', () => {
        describe('from available to applied', () => {
            it('should create new application when moving from available to applied', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'available',
                    toColumn: 'applied'
                };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(null);
                mockApplicationRepository.createApplication.mockResolvedValue(mockApplication);

                const result = await pipelineService.handleDragDrop(mockUserId, dragRequest);

                expect(result.success).toBe(true);
                expect(result.updatedApplication).toEqual(mockApplication);
                expect(result.message).toBe('Application created successfully');
                expect(mockApplicationRepository.createApplication).toHaveBeenCalledWith({
                    userId: mockUserId,
                    jobId: mockJobId,
                    status: 'applied',
                    coverLetter: undefined,
                    notes: undefined,
                    interviewDate: undefined
                });
            });

            it('should throw error if application already exists', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'available',
                    toColumn: 'applied'
                };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(mockApplication);

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Application already exists for this job');
            });

            it('should throw error when trying to move from available to non-applied status', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'available',
                    toColumn: 'interview'
                };

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Can only apply to jobs from available column');
            });
        });

        describe('from status to available (withdraw)', () => {
            it('should delete application when moving from status to available', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'applied',
                    toColumn: 'available'
                };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(mockApplication);
                mockApplicationRepository.delete.mockResolvedValue(true);

                const result = await pipelineService.handleDragDrop(mockUserId, dragRequest);

                expect(result.success).toBe(true);
                expect(result.message).toBe('Application withdrawn successfully');
                expect(mockApplicationRepository.delete).toHaveBeenCalledWith(mockApplication.id);
            });

            it('should throw error if application not found for withdrawal', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'applied',
                    toColumn: 'available'
                };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(null);

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Application not found');
            });
        });

        describe('between status columns', () => {
            it('should update application status when moving between status columns', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'applied',
                    toColumn: 'interview'
                };

                const updatedApplication = { ...mockApplication, status: 'interview' as ApplicationStatus };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(mockApplication);
                mockApplicationStatusService.updateApplicationStatus.mockResolvedValue(updatedApplication);

                const result = await pipelineService.handleDragDrop(mockUserId, dragRequest);

                expect(result.success).toBe(true);
                expect(result.updatedApplication).toEqual(updatedApplication);
                expect(result.message).toBe('Application status updated to interview');
                expect(mockApplicationStatusService.updateApplicationStatus).toHaveBeenCalledWith(
                    mockApplication.id,
                    mockUserId,
                    { status: 'interview' }
                );
            });

            it('should throw error if application not found for status update', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'applied',
                    toColumn: 'interview'
                };

                mockApplicationRepository.findByUserIdAndJobId.mockResolvedValue(null);

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Application not found');
            });
        });

        describe('same column movement', () => {
            it('should return success without changes when moving within same column', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'applied',
                    toColumn: 'applied'
                };

                const result = await pipelineService.handleDragDrop(mockUserId, dragRequest);

                expect(result.success).toBe(true);
                expect(result.message).toBe('Job position updated within column');
                expect(mockApplicationRepository.findByUserIdAndJobId).not.toHaveBeenCalled();
            });
        });

        describe('invalid columns', () => {
            it('should throw error for invalid fromColumn', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'invalid',
                    toColumn: 'applied'
                };

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Invalid column specified');
            });

            it('should throw error for invalid toColumn', async () => {
                const dragRequest: DragDropRequest = {
                    jobId: mockJobId,
                    fromColumn: 'available',
                    toColumn: 'invalid'
                };

                await expect(pipelineService.handleDragDrop(mockUserId, dragRequest))
                    .rejects.toThrow('Invalid column specified');
            });
        });
    });

    describe('getValidDropTargets', () => {
        it('should return only applied for available column', async () => {
            const result = await pipelineService.getValidDropTargets(mockUserId, mockJobId, 'available');

            expect(result).toEqual(['applied']);
        });

        it('should return valid transitions plus available for status columns', async () => {
            mockApplicationStatusService.getValidNextStatuses.mockReturnValue(['interview', 'rejected']);

            const result = await pipelineService.getValidDropTargets(mockUserId, mockJobId, 'applied');

            expect(result).toEqual(['available', 'interview', 'rejected']);
            expect(mockApplicationStatusService.getValidNextStatuses).toHaveBeenCalledWith('applied');
        });
    });

    describe('getPipelineStats', () => {
        it('should return correct pipeline statistics', async () => {
            const applications = [
                { ...mockApplication, status: 'applied' as ApplicationStatus },
                { ...mockApplication, id: 'app-2', status: 'interview' as ApplicationStatus },
                { ...mockApplication, id: 'app-3', status: 'offered' as ApplicationStatus },
                { ...mockApplication, id: 'app-4', status: 'rejected' as ApplicationStatus }
            ];

            mockApplicationRepository.findByUserId.mockResolvedValue(applications);
            (mockJobRepository as any).getAvailableJobsNotAppliedTo.mockResolvedValue([mockJob, { ...mockJob, id: 'job-2' }]);

            const result = await pipelineService.getPipelineStats(mockUserId);

            expect(result).toEqual({
                available: 2,
                applied: 1,
                interview: 1,
                offered: 1,
                rejected: 1
            });
        });

        it('should handle empty data correctly', async () => {
            mockApplicationRepository.findByUserId.mockResolvedValue([]);
            (mockJobRepository as any).getAvailableJobsNotAppliedTo.mockResolvedValue([]);

            const result = await pipelineService.getPipelineStats(mockUserId);

            expect(result).toEqual({
                available: 0,
                applied: 0,
                interview: 0,
                offered: 0,
                rejected: 0
            });
        });
    });
});