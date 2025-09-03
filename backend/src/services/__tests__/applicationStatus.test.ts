import { ApplicationStatusService, StatusUpdateRequest } from '../applicationStatus';
import { ApplicationRepository } from '../../database/repositories/application';
import { Application, ApplicationStatus, StatusChange } from '../../types/database';

// Mock the logger
jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock the ApplicationRepository
jest.mock('../../database/repositories/application');

describe('ApplicationStatusService', () => {
    let applicationStatusService: ApplicationStatusService;
    let mockApplicationRepository: jest.Mocked<ApplicationRepository>;

    const mockUserId = 'user-123';
    const mockApplicationId = 'app-123';
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
        mockApplicationRepository = new ApplicationRepository() as jest.Mocked<ApplicationRepository>;
        applicationStatusService = new ApplicationStatusService(mockApplicationRepository);
        jest.clearAllMocks();
    });

    describe('updateApplicationStatus', () => {
        it('should successfully update application status from applied to interview', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'interview',
                notes: 'Interview scheduled',
                interviewDate: new Date('2024-01-15'),
            };

            const updatedApplication: Application = {
                ...mockApplication,
                status: 'interview',
                notes: 'Interview scheduled',
                interviewDate: new Date('2024-01-15'),
            };

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);
            mockApplicationRepository.updateStatus.mockResolvedValue(updatedApplication);
            mockApplicationRepository.updateInterviewDate.mockResolvedValue(updatedApplication);

            const result = await applicationStatusService.updateApplicationStatus(
                mockApplicationId,
                mockUserId,
                updateRequest
            );

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateStatus).toHaveBeenCalledWith(
                mockApplicationId,
                'interview',
                'Interview scheduled'
            );
            expect(mockApplicationRepository.updateInterviewDate).toHaveBeenCalledWith(
                mockApplicationId,
                new Date('2024-01-15')
            );
            expect(result).toEqual(updatedApplication);
        });

        it('should successfully update application status without interview date', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'rejected',
                notes: 'Position filled',
            };

            const updatedApplication: Application = {
                ...mockApplication,
                status: 'rejected',
                notes: 'Position filled',
            };

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);
            mockApplicationRepository.updateStatus.mockResolvedValue(updatedApplication);

            const result = await applicationStatusService.updateApplicationStatus(
                mockApplicationId,
                mockUserId,
                updateRequest
            );

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateStatus).toHaveBeenCalledWith(
                mockApplicationId,
                'rejected',
                'Position filled'
            );
            expect(mockApplicationRepository.updateInterviewDate).not.toHaveBeenCalled();
            expect(result).toEqual(updatedApplication);
        });

        it('should throw error when application not found', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'interview',
            };

            mockApplicationRepository.findById.mockResolvedValue(null);

            await expect(
                applicationStatusService.updateApplicationStatus(mockApplicationId, mockUserId, updateRequest)
            ).rejects.toThrow('Application not found');

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('should throw error when user does not own application', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'interview',
            };

            const otherUserApplication = { ...mockApplication, userId: 'other-user' };
            mockApplicationRepository.findById.mockResolvedValue(otherUserApplication);

            await expect(
                applicationStatusService.updateApplicationStatus(mockApplicationId, mockUserId, updateRequest)
            ).rejects.toThrow('Unauthorized: Application does not belong to user');

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('should throw error for invalid status transition', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'offered', // Invalid: can't go directly from applied to offered
            };

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);

            await expect(
                applicationStatusService.updateApplicationStatus(mockApplicationId, mockUserId, updateRequest)
            ).rejects.toThrow("Invalid status transition from 'applied' to 'offered'");

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('should allow staying in the same status (for updates)', async () => {
            const updateRequest: StatusUpdateRequest = {
                status: 'applied',
                notes: 'Updated notes',
            };

            const updatedApplication: Application = {
                ...mockApplication,
                notes: 'Updated notes',
            };

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);
            mockApplicationRepository.updateStatus.mockResolvedValue(updatedApplication);

            const result = await applicationStatusService.updateApplicationStatus(
                mockApplicationId,
                mockUserId,
                updateRequest
            );

            expect(mockApplicationRepository.updateStatus).toHaveBeenCalledWith(
                mockApplicationId,
                'applied',
                'Updated notes'
            );
            expect(result).toEqual(updatedApplication);
        });
    });

    describe('getApplicationStatusHistory', () => {
        it('should return status history for valid application', async () => {
            const mockStatusHistory: StatusChange[] = [
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

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);
            mockApplicationRepository.getStatusHistory.mockResolvedValue(mockStatusHistory);

            const result = await applicationStatusService.getApplicationStatusHistory(
                mockApplicationId,
                mockUserId
            );

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.getStatusHistory).toHaveBeenCalledWith(mockApplicationId);
            expect(result).toEqual(mockStatusHistory);
        });

        it('should throw error when application not found', async () => {
            mockApplicationRepository.findById.mockResolvedValue(null);

            await expect(
                applicationStatusService.getApplicationStatusHistory(mockApplicationId, mockUserId)
            ).rejects.toThrow('Application not found');

            expect(mockApplicationRepository.getStatusHistory).not.toHaveBeenCalled();
        });

        it('should throw error when user does not own application', async () => {
            const otherUserApplication = { ...mockApplication, userId: 'other-user' };
            mockApplicationRepository.findById.mockResolvedValue(otherUserApplication);

            await expect(
                applicationStatusService.getApplicationStatusHistory(mockApplicationId, mockUserId)
            ).rejects.toThrow('Unauthorized: Application does not belong to user');

            expect(mockApplicationRepository.getStatusHistory).not.toHaveBeenCalled();
        });
    });

    describe('addApplicationNotes', () => {
        it('should successfully add notes to application', async () => {
            const notes = 'New notes added';
            const updatedApplication: Application = {
                ...mockApplication,
                notes,
            };

            mockApplicationRepository.findById.mockResolvedValue(mockApplication);
            mockApplicationRepository.addNotes.mockResolvedValue(updatedApplication);

            const result = await applicationStatusService.addApplicationNotes(
                mockApplicationId,
                mockUserId,
                notes
            );

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.addNotes).toHaveBeenCalledWith(mockApplicationId, notes);
            expect(result).toEqual(updatedApplication);
        });

        it('should throw error when application not found', async () => {
            mockApplicationRepository.findById.mockResolvedValue(null);

            await expect(
                applicationStatusService.addApplicationNotes(mockApplicationId, mockUserId, 'notes')
            ).rejects.toThrow('Application not found');

            expect(mockApplicationRepository.addNotes).not.toHaveBeenCalled();
        });
    });

    describe('updateInterviewDate', () => {
        it('should successfully update interview date for interview status application', async () => {
            const interviewApplication: Application = {
                ...mockApplication,
                status: 'interview',
            };

            const interviewDate = new Date('2024-01-20');
            const updatedApplication: Application = {
                ...interviewApplication,
                interviewDate,
            };

            mockApplicationRepository.findById.mockResolvedValue(interviewApplication);
            mockApplicationRepository.updateInterviewDate.mockResolvedValue(updatedApplication);

            const result = await applicationStatusService.updateInterviewDate(
                mockApplicationId,
                mockUserId,
                interviewDate
            );

            expect(mockApplicationRepository.findById).toHaveBeenCalledWith(mockApplicationId);
            expect(mockApplicationRepository.updateInterviewDate).toHaveBeenCalledWith(
                mockApplicationId,
                interviewDate
            );
            expect(result).toEqual(updatedApplication);
        });

        it('should throw error when application is not in interview status', async () => {
            const interviewDate = new Date('2024-01-20');

            mockApplicationRepository.findById.mockResolvedValue(mockApplication); // status is 'applied'

            await expect(
                applicationStatusService.updateInterviewDate(mockApplicationId, mockUserId, interviewDate)
            ).rejects.toThrow('Can only set interview date for applications in interview status');

            expect(mockApplicationRepository.updateInterviewDate).not.toHaveBeenCalled();
        });
    });

    describe('getApplicationsByStatus', () => {
        it('should return applications filtered by status', async () => {
            const mockApplications: Application[] = [mockApplication];

            mockApplicationRepository.findByUserIdAndStatus.mockResolvedValue(mockApplications);

            const result = await applicationStatusService.getApplicationsByStatus(mockUserId, 'applied');

            expect(mockApplicationRepository.findByUserIdAndStatus).toHaveBeenCalledWith(
                mockUserId,
                'applied'
            );
            expect(result).toEqual(mockApplications);
        });

        it('should return all applications when no status filter provided', async () => {
            const mockApplications: Application[] = [mockApplication];

            mockApplicationRepository.findByUserId.mockResolvedValue(mockApplications);

            const result = await applicationStatusService.getApplicationsByStatus(mockUserId);

            expect(mockApplicationRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
            expect(result).toEqual(mockApplications);
        });
    });

    describe('getApplicationStatistics', () => {
        it('should return application statistics', async () => {
            const mockStats = {
                total: 10,
                applied: 5,
                interview: 3,
                offered: 1,
                rejected: 1,
            };

            mockApplicationRepository.getApplicationStats.mockResolvedValue(mockStats);

            const result = await applicationStatusService.getApplicationStatistics(mockUserId);

            expect(mockApplicationRepository.getApplicationStats).toHaveBeenCalledWith(mockUserId);
            expect(result).toEqual(mockStats);
        });
    });

    describe('getValidNextStatuses', () => {
        it('should return valid next statuses for applied status', () => {
            const result = applicationStatusService.getValidNextStatuses('applied');
            expect(result).toEqual(['interview', 'rejected']);
        });

        it('should return valid next statuses for interview status', () => {
            const result = applicationStatusService.getValidNextStatuses('interview');
            expect(result).toEqual(['offered', 'rejected']);
        });

        it('should return valid next statuses for offered status', () => {
            const result = applicationStatusService.getValidNextStatuses('offered');
            expect(result).toEqual(['rejected']);
        });

        it('should return empty array for rejected status (terminal)', () => {
            const result = applicationStatusService.getValidNextStatuses('rejected');
            expect(result).toEqual([]);
        });
    });

    describe('Status transition validation', () => {
        const testCases = [
            // Valid transitions
            { from: 'applied', to: 'interview', expected: true },
            { from: 'applied', to: 'rejected', expected: true },
            { from: 'interview', to: 'offered', expected: true },
            { from: 'interview', to: 'rejected', expected: true },
            { from: 'offered', to: 'rejected', expected: true },

            // Same status (allowed for updates)
            { from: 'applied', to: 'applied', expected: true },
            { from: 'interview', to: 'interview', expected: true },

            // Invalid transitions
            { from: 'applied', to: 'offered', expected: false },
            { from: 'rejected', to: 'applied', expected: false },
            { from: 'rejected', to: 'interview', expected: false },
            { from: 'rejected', to: 'offered', expected: false },
        ];

        testCases.forEach(({ from, to, expected }) => {
            it(`should ${expected ? 'allow' : 'reject'} transition from ${from} to ${to}`, async () => {
                const updateRequest: StatusUpdateRequest = { status: to as ApplicationStatus };
                const testApplication: Application = { ...mockApplication, status: from as ApplicationStatus };

                mockApplicationRepository.findById.mockResolvedValue(testApplication);

                if (expected) {
                    const updatedApplication: Application = { ...testApplication, status: to as ApplicationStatus };
                    mockApplicationRepository.updateStatus.mockResolvedValue(updatedApplication);

                    const result = await applicationStatusService.updateApplicationStatus(
                        mockApplicationId,
                        mockUserId,
                        updateRequest
                    );

                    expect(result.status).toBe(to);
                } else {
                    await expect(
                        applicationStatusService.updateApplicationStatus(
                            mockApplicationId,
                            mockUserId,
                            updateRequest
                        )
                    ).rejects.toThrow(`Invalid status transition from '${from}' to '${to}'`);
                }
            });
        });
    });
});