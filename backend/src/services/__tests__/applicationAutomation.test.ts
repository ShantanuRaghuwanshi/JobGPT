import { ApplicationAutomationService, ApplicationData, ApplicationResult } from '../applicationAutomation';
import { ApplicationRepository } from '../../database/repositories/application';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { JobRepository } from '../../database/repositories/job';
import { Application, ApplicationStatus, Job, UserProfile } from '../../types/database';
import puppeteer, { Browser, Page } from 'puppeteer';

// Mock dependencies
jest.mock('../../database/repositories/application');
jest.mock('../../database/repositories/userProfile');
jest.mock('../../database/repositories/job');
jest.mock('puppeteer');
jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('ApplicationAutomationService', () => {
    let service: ApplicationAutomationService;
    let mockApplicationRepo: jest.Mocked<ApplicationRepository>;
    let mockUserProfileRepo: jest.Mocked<UserProfileRepository>;
    let mockJobRepo: jest.Mocked<JobRepository>;
    let mockBrowser: jest.Mocked<Browser>;
    let mockPage: jest.Mocked<Page>;

    const mockUserProfile: UserProfile = {
        id: 'profile-1',
        userId: 'user-1',
        name: 'John Doe',
        age: 30,
        location: 'San Francisco, CA',
        resumeId: 'resume-1',
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceLevel: 'mid',
        preferences: {
            locations: ['San Francisco', 'Remote'],
            experienceLevels: ['mid', 'senior'],
            keywords: ['frontend', 'fullstack'],
            remoteWork: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockJob: Job = {
        id: 'job-1',
        title: 'Frontend Developer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Frontend developer position',
        requirements: ['React', 'JavaScript'],
        experienceLevel: 'mid',
        applicationUrl: 'https://example.com/apply',
        isAvailable: true,
        crawledAt: new Date(),
        updatedAt: new Date()
    };

    const mockApplication: Application = {
        id: 'app-1',
        userId: 'user-1',
        jobId: 'job-1',
        status: 'applied',
        appliedAt: new Date(),
        coverLetter: 'Test cover letter',
        notes: 'Test notes'
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup repository mocks
        mockApplicationRepo = new ApplicationRepository() as jest.Mocked<ApplicationRepository>;
        mockUserProfileRepo = new UserProfileRepository() as jest.Mocked<UserProfileRepository>;
        mockJobRepo = new JobRepository() as jest.Mocked<JobRepository>;

        // Setup puppeteer mocks
        mockPage = {
            goto: jest.fn(),
            waitForTimeout: jest.fn(),
            waitForSelector: jest.fn(),
            $: jest.fn(),
            focus: jest.fn(),
            evaluate: jest.fn(),
            type: jest.fn(),
            select: jest.fn(),
            click: jest.fn(),
            close: jest.fn(),
            setUserAgent: jest.fn(),
            isIntersectingViewport: jest.fn().mockResolvedValue(true)
        } as any;

        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn()
        } as any;

        (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

        // Create service instance
        service = new ApplicationAutomationService();

        // Inject mocked repositories
        (service as any).applicationRepo = mockApplicationRepo;
        (service as any).userProfileRepo = mockUserProfileRepo;
        (service as any).jobRepo = mockJobRepo;
    });

    afterEach(async () => {
        await service.closeBrowser();
    });

    describe('prepareApplicationData', () => {
        it('should prepare application data successfully', async () => {
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockJobRepo.findById.mockResolvedValue(mockJob);

            const result = await service.prepareApplicationData('user-1', 'job-1', 'Cover letter');

            expect(result).toEqual({
                jobId: 'job-1',
                userId: 'user-1',
                personalInfo: {
                    name: 'John Doe',
                    email: 'user@example.com', // Placeholder email
                    location: 'San Francisco, CA'
                },
                coverLetter: 'Cover letter',
                additionalInfo: {
                    experienceLevel: 'mid',
                    skills: 'JavaScript, React, Node.js'
                }
            });
        });

        it('should throw error when user profile not found', async () => {
            mockUserProfileRepo.findByUserId.mockResolvedValue(null);

            await expect(service.prepareApplicationData('user-1', 'job-1'))
                .rejects.toThrow('User profile not found');
        });

        it('should throw error when job not found', async () => {
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockJobRepo.findById.mockResolvedValue(null);

            await expect(service.prepareApplicationData('user-1', 'job-1'))
                .rejects.toThrow('Job not found');
        });
    });

    describe('autoFillApplication', () => {
        const mockApplicationData: ApplicationData = {
            jobId: 'job-1',
            userId: 'user-1',
            personalInfo: {
                name: 'John Doe',
                email: 'john@example.com',
                location: 'San Francisco, CA'
            },
            coverLetter: 'Test cover letter'
        };

        it('should successfully auto-fill application form', async () => {
            // Mock form elements
            const mockElement = {
                isIntersectingViewport: jest.fn().mockResolvedValue(true)
            };
            mockPage.$.mockResolvedValue(mockElement as any);
            mockPage.evaluate.mockResolvedValue(true); // Element is enabled

            const result = await service.autoFillApplication('https://example.com/apply', mockApplicationData);

            expect(result.success).toBe(true);
            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/apply', { waitUntil: 'networkidle2', timeout: 30000 });
            expect(mockPage.setUserAgent).toHaveBeenCalled();
        });

        it('should handle navigation errors gracefully', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

            const result = await service.autoFillApplication('https://example.com/apply', mockApplicationData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Navigation failed');
        });

        it('should close page even if error occurs', async () => {
            mockPage.goto.mockRejectedValue(new Error('Test error'));

            await service.autoFillApplication('https://example.com/apply', mockApplicationData);

            expect(mockPage.close).toHaveBeenCalled();
        });
    });

    describe('submitApplication', () => {
        it('should successfully submit application', async () => {
            mockApplicationRepo.findByUserIdAndJobId.mockResolvedValue(null);
            mockJobRepo.findById.mockResolvedValue(mockJob);
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockApplicationRepo.createApplication.mockResolvedValue(mockApplication);

            // Mock successful auto-fill
            const mockElement = {
                isIntersectingViewport: jest.fn().mockResolvedValue(true)
            };
            mockPage.$.mockResolvedValue(mockElement as any);
            mockPage.evaluate.mockResolvedValue(true);

            const result = await service.submitApplication('user-1', 'job-1', 'Cover letter');

            expect(result.success).toBe(true);
            expect(result.applicationId).toBe('app-1');
            expect(mockApplicationRepo.createApplication).toHaveBeenCalledWith({
                userId: 'user-1',
                jobId: 'job-1',
                status: 'applied',
                coverLetter: 'Cover letter',
                notes: 'Auto-filled successfully'
            });
        });

        it('should return error if application already exists', async () => {
            mockApplicationRepo.findByUserIdAndJobId.mockResolvedValue(mockApplication);

            const result = await service.submitApplication('user-1', 'job-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Application already exists for this job');
            expect(result.applicationId).toBe('app-1');
        });

        it('should return error if job not found', async () => {
            mockApplicationRepo.findByUserIdAndJobId.mockResolvedValue(null);
            mockJobRepo.findById.mockResolvedValue(null);

            const result = await service.submitApplication('user-1', 'job-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Job not found');
        });

        it('should return error if job is not available', async () => {
            mockApplicationRepo.findByUserIdAndJobId.mockResolvedValue(null);
            mockJobRepo.findById.mockResolvedValue({ ...mockJob, isAvailable: false });

            const result = await service.submitApplication('user-1', 'job-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Job is no longer available');
        });
    });

    describe('retryApplication', () => {
        it('should successfully retry application', async () => {
            mockApplicationRepo.findById.mockResolvedValue(mockApplication);
            mockJobRepo.findById.mockResolvedValue(mockJob);
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockApplicationRepo.addNotes.mockResolvedValue(mockApplication);

            // Mock successful auto-fill on first retry
            const mockElement = {
                isIntersectingViewport: jest.fn().mockResolvedValue(true)
            };
            mockPage.$.mockResolvedValue(mockElement as any);
            mockPage.evaluate.mockResolvedValue(true);

            const result = await service.retryApplication('app-1', 3);

            expect(result.success).toBe(true);
            expect(result.applicationId).toBe('app-1');
            expect(mockApplicationRepo.addNotes).toHaveBeenCalledWith('app-1', 'Retry successful on attempt 1');
        });

        it('should fail after max retries', async () => {
            mockApplicationRepo.findById.mockResolvedValue(mockApplication);
            mockJobRepo.findById.mockResolvedValue(mockJob);
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockApplicationRepo.addNotes.mockResolvedValue(mockApplication);

            // Mock failed auto-fill
            mockPage.goto.mockRejectedValue(new Error('Network error'));

            const result = await service.retryApplication('app-1', 2);

            expect(result.success).toBe(false);
            expect(result.error).toContain('All retry attempts failed');
            expect(mockApplicationRepo.addNotes).toHaveBeenCalledWith('app-1', expect.stringContaining('All 2 retry attempts failed'));
        });

        it('should return error if application not found', async () => {
            mockApplicationRepo.findById.mockResolvedValue(null);

            const result = await service.retryApplication('app-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Application not found');
        });
    });

    describe('updateApplicationStatus', () => {
        it('should successfully update application status', async () => {
            const updatedApplication = { ...mockApplication, status: 'interview' as ApplicationStatus };
            mockApplicationRepo.updateStatus.mockResolvedValue(updatedApplication);

            const result = await service.updateApplicationStatus('app-1', 'interview', 'Interview scheduled');

            expect(result.success).toBe(true);
            expect(result.applicationId).toBe('app-1');
            expect(mockApplicationRepo.updateStatus).toHaveBeenCalledWith('app-1', 'interview', 'Interview scheduled');
        });

        it('should return error if application not found', async () => {
            mockApplicationRepo.updateStatus.mockResolvedValue(null);

            const result = await service.updateApplicationStatus('app-1', 'interview');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Application not found');
        });
    });

    describe('getUserApplications', () => {
        it('should return user applications', async () => {
            const applications = [mockApplication];
            mockApplicationRepo.findByUserId.mockResolvedValue(applications);

            const result = await service.getUserApplications('user-1');

            expect(result).toEqual(applications);
            expect(mockApplicationRepo.findByUserId).toHaveBeenCalledWith('user-1');
        });

        it('should return empty array on error', async () => {
            mockApplicationRepo.findByUserId.mockRejectedValue(new Error('Database error'));

            const result = await service.getUserApplications('user-1');

            expect(result).toEqual([]);
        });
    });

    describe('getApplicationStats', () => {
        it('should return application statistics', async () => {
            const stats = { total: 10, applied: 5, interview: 3, offered: 1, rejected: 1 };
            mockApplicationRepo.getApplicationStats.mockResolvedValue(stats);

            const result = await service.getApplicationStats('user-1');

            expect(result).toEqual(stats);
            expect(mockApplicationRepo.getApplicationStats).toHaveBeenCalledWith('user-1');
        });

        it('should return zero stats on error', async () => {
            mockApplicationRepo.getApplicationStats.mockRejectedValue(new Error('Database error'));

            const result = await service.getApplicationStats('user-1');

            expect(result).toEqual({ total: 0, applied: 0, interview: 0, offered: 0, rejected: 0 });
        });
    });

    describe('getApplicationStatus', () => {
        it('should return application status', async () => {
            mockApplicationRepo.findById.mockResolvedValue(mockApplication);

            const result = await service.getApplicationStatus('app-1');

            expect(result).toEqual(mockApplication);
            expect(mockApplicationRepo.findById).toHaveBeenCalledWith('app-1');
        });

        it('should return null on error', async () => {
            mockApplicationRepo.findById.mockRejectedValue(new Error('Database error'));

            const result = await service.getApplicationStatus('app-1');

            expect(result).toBeNull();
        });
    });

    describe('closeBrowser', () => {
        it('should close browser if it exists', async () => {
            // Initialize browser first
            await service.autoFillApplication('https://example.com', {
                jobId: 'job-1',
                userId: 'user-1',
                personalInfo: { name: 'Test', email: 'test@example.com', location: 'Test' }
            });

            await service.closeBrowser();

            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should not throw error if browser does not exist', async () => {
            await expect(service.closeBrowser()).resolves.not.toThrow();
        });
    });
});