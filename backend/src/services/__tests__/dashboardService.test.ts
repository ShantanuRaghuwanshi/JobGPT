import { DashboardService } from '../dashboardService';
import { JobService } from '../jobService';
import { ApplicationStatusService } from '../applicationStatus';
import { JobMatchingService } from '../jobMatching';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { ApplicationRepository } from '../../database/repositories/application';
import { JobRepository } from '../../database/repositories/job';

// Mock all dependencies
jest.mock('../jobService');
jest.mock('../applicationStatus');
jest.mock('../jobMatching');
jest.mock('../../database/repositories/userProfile');
jest.mock('../../database/repositories/application');
jest.mock('../../database/repositories/job');
jest.mock('../../config/logger');

describe('DashboardService', () => {
    let dashboardService: DashboardService;
    let mockJobService: jest.Mocked<JobService>;
    let mockApplicationStatusService: jest.Mocked<ApplicationStatusService>;
    let mockJobMatchingService: jest.Mocked<JobMatchingService>;
    let mockUserProfileRepository: jest.Mocked<UserProfileRepository>;
    let mockApplicationRepository: jest.Mocked<ApplicationRepository>;
    let mockJobRepository: jest.Mocked<JobRepository>;

    const mockUserId = 'user-123';
    const mockUserProfile = {
        id: 'profile-123',
        userId: mockUserId,
        name: 'John Doe',
        location: 'San Francisco, CA',
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceLevel: 'mid' as const,
        resumeId: 'resume-123',
        preferences: {
            locations: ['San Francisco', 'Remote'],
            experienceLevels: ['mid' as const],
            keywords: ['frontend', 'fullstack'],
            remoteWork: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockApplicationStats = {
        total: 10,
        applied: 5,
        interview: 3,
        offered: 1,
        rejected: 1
    };

    const mockJobStats = {
        total: 1000,
        available: 800,
        unavailable: 200,
        byExperienceLevel: {
            entry: 200,
            mid: 300,
            senior: 400,
            lead: 100
        },
        recentlyAdded: 50
    };

    const mockJobMatches = [
        {
            job: {
                id: 'job-1',
                title: 'Frontend Developer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great frontend role',
                requirements: ['JavaScript', 'React'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://example.com/apply',
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            },
            score: 85,
            matchReasons: ['Experience level match', '2 skill matches'],
            skillMatches: ['JavaScript', 'React'],
            locationMatch: true,
            experienceMatch: true
        }
    ];

    const mockMatchStats = {
        totalMatches: 25,
        highQualityMatches: 8,
        mediumQualityMatches: 12,
        lowQualityMatches: 5,
        averageScore: 65.5,
        topSkillMatches: ['JavaScript', 'React', 'Node.js'],
        preferredLocationsAvailable: 15
    };

    beforeEach(() => {
        // Create mocked instances
        mockJobService = new JobService({} as any) as jest.Mocked<JobService>;
        mockApplicationStatusService = new ApplicationStatusService({} as any) as jest.Mocked<ApplicationStatusService>;
        mockJobMatchingService = new JobMatchingService({} as any, {} as any, {} as any) as jest.Mocked<JobMatchingService>;
        mockUserProfileRepository = new UserProfileRepository() as jest.Mocked<UserProfileRepository>;
        mockApplicationRepository = new ApplicationRepository() as jest.Mocked<ApplicationRepository>;
        mockJobRepository = new JobRepository() as jest.Mocked<JobRepository>;

        dashboardService = new DashboardService(
            mockJobService,
            mockApplicationStatusService,
            mockJobMatchingService,
            mockUserProfileRepository,
            mockApplicationRepository,
            mockJobRepository
        );

        // Setup default mocks
        mockUserProfileRepository.findByUserId.mockResolvedValue(mockUserProfile);
        mockApplicationRepository.getApplicationStats.mockResolvedValue(mockApplicationStats);
        mockJobService.getJobStats.mockResolvedValue(mockJobStats);
        mockJobMatchingService.getMatchStatistics.mockResolvedValue(mockMatchStats);
        mockJobMatchingService.getJobRecommendations.mockResolvedValue(mockJobMatches);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getDashboardStats', () => {
        it('should return comprehensive dashboard statistics', async () => {
            const result = await dashboardService.getDashboardStats(mockUserId);

            expect(result).toEqual({
                user: {
                    profileComplete: true,
                    totalApplications: 10,
                    activeApplications: 8, // applied + interview
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
                    successRate: 10 // 1 offer / 10 total * 100
                },
                recommendations: {
                    topMatches: [{
                        jobId: 'job-1',
                        title: 'Frontend Developer',
                        company: 'Tech Corp',
                        score: 85,
                        matchReasons: ['Experience level match', '2 skill matches']
                    }],
                    skillsInDemand: ['JavaScript', 'React', 'Node.js'],
                    suggestedLocations: expect.any(Array)
                }
            });

            expect(mockUserProfileRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
            expect(mockApplicationRepository.getApplicationStats).toHaveBeenCalledWith(mockUserId);
            expect(mockJobService.getJobStats).toHaveBeenCalled();
            expect(mockJobMatchingService.getMatchStatistics).toHaveBeenCalledWith(mockUserId);
            expect(mockJobMatchingService.getJobRecommendations).toHaveBeenCalledWith(mockUserId, 5);
        });

        it('should handle incomplete profile', async () => {
            const incompleteProfile = {
                ...mockUserProfile,
                skills: [],
                resumeId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockUserProfileRepository.findByUserId.mockResolvedValue(incompleteProfile);

            const result = await dashboardService.getDashboardStats(mockUserId);

            expect(result.user.profileComplete).toBe(false);
        });

        it('should handle missing user profile', async () => {
            mockUserProfileRepository.findByUserId.mockResolvedValue(null);

            const result = await dashboardService.getDashboardStats(mockUserId);

            expect(result.user.profileComplete).toBe(false);
        });

        it('should calculate success rate correctly with zero applications', async () => {
            const zeroStats = {
                total: 0,
                applied: 0,
                interview: 0,
                offered: 0,
                rejected: 0
            };
            mockApplicationRepository.getApplicationStats.mockResolvedValue(zeroStats);

            const result = await dashboardService.getDashboardStats(mockUserId);

            expect(result.applications.successRate).toBe(0);
        });
    });

    describe('getRecentActivity', () => {
        const mockApplications = [
            {
                id: 'app-1',
                userId: mockUserId,
                jobId: 'job-1',
                status: 'applied' as const,
                appliedAt: new Date('2024-01-15'),
                coverLetter: undefined,
                notes: undefined,
                interviewDate: undefined
            },
            {
                id: 'app-2',
                userId: mockUserId,
                jobId: 'job-2',
                status: 'interview' as const,
                appliedAt: new Date('2024-01-10'),
                coverLetter: undefined,
                notes: undefined,
                interviewDate: new Date('2024-01-20')
            }
        ];

        const mockJobs = [
            {
                id: 'job-1',
                title: 'Frontend Developer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great role',
                requirements: ['JavaScript'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://example.com',
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'job-2',
                title: 'Backend Developer',
                company: 'Dev Inc',
                location: 'Remote',
                description: 'Backend role',
                requirements: ['Node.js'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://example.com',
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            }
        ];

        beforeEach(() => {
            mockApplicationRepository.findByUserId.mockResolvedValue(mockApplications);
            mockApplicationRepository.getStatusHistory.mockResolvedValue([]);
            mockJobRepository.findById.mockImplementation(async (id) => {
                return mockJobs.find(job => job.id === id) || null;
            });
        });

        it('should return recent activity with applications', async () => {
            const result = await dashboardService.getRecentActivity(mockUserId, 5);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                type: 'application',
                timestamp: new Date('2024-01-15'),
                description: 'Applied to Frontend Developer at Tech Corp',
                jobTitle: 'Frontend Developer',
                company: 'Tech Corp',
                status: 'applied'
            });
            expect(result[1]).toEqual({
                type: 'application',
                timestamp: new Date('2024-01-10'),
                description: 'Applied to Backend Developer at Dev Inc',
                jobTitle: 'Backend Developer',
                company: 'Dev Inc',
                status: 'interview'
            });
        });

        it('should include status changes in activity', async () => {
            const mockStatusHistory = [
                {
                    id: 'status-1',
                    applicationId: 'app-1',
                    fromStatus: 'applied' as const,
                    toStatus: 'interview' as const,
                    changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (within 7 days)
                    notes: undefined
                }
            ];
            mockApplicationRepository.getStatusHistory.mockResolvedValue(mockStatusHistory);

            const result = await dashboardService.getRecentActivity(mockUserId, 10);

            expect(result.some(activity => activity.type === 'status_update')).toBe(true);
        });

        it('should limit results correctly', async () => {
            const result = await dashboardService.getRecentActivity(mockUserId, 1);

            expect(result).toHaveLength(1);
        });
    });

    describe('getUpcomingInterviews', () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        const mockInterviewApplications = [
            {
                id: 'app-1',
                userId: mockUserId,
                jobId: 'job-1',
                status: 'interview' as const,
                appliedAt: new Date(),
                coverLetter: undefined,
                notes: undefined,
                interviewDate: futureDate
            },
            {
                id: 'app-2',
                userId: mockUserId,
                jobId: 'job-2',
                status: 'interview' as const,
                appliedAt: new Date(),
                coverLetter: undefined,
                notes: undefined,
                interviewDate: pastDate // Should be filtered out
            }
        ];

        beforeEach(() => {
            mockApplicationRepository.findByUserIdAndStatus.mockResolvedValue(mockInterviewApplications);
            mockJobRepository.findById.mockResolvedValue({
                id: 'job-1',
                title: 'Frontend Developer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great role',
                requirements: ['JavaScript'],
                experienceLevel: 'mid' as const,
                applicationUrl: 'https://example.com',
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            });
        });

        it('should return upcoming interviews only', async () => {
            const result = await dashboardService.getUpcomingInterviews(mockUserId);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                applicationId: 'app-1',
                jobTitle: 'Frontend Developer',
                company: 'Tech Corp',
                interviewDate: futureDate,
                status: 'interview'
            });
        });

        it('should sort interviews by date', async () => {
            const earlierDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const laterDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

            const applications = [
                {
                    ...mockInterviewApplications[0],
                    id: 'app-later',
                    interviewDate: laterDate
                },
                {
                    ...mockInterviewApplications[0],
                    id: 'app-earlier',
                    interviewDate: earlierDate
                }
            ];

            mockApplicationRepository.findByUserIdAndStatus.mockResolvedValue(applications);

            const result = await dashboardService.getUpcomingInterviews(mockUserId);

            expect(result[0].applicationId).toBe('app-earlier');
            expect(result[1].applicationId).toBe('app-later');
        });
    });

    describe('refreshJobRecommendations', () => {
        it('should refresh job recommendations successfully', async () => {
            mockJobMatchingService.getJobMatches.mockResolvedValue({
                matches: mockJobMatches,
                total: 1,
                userProfile: mockUserProfile,
                appliedJobIds: []
            });

            await expect(dashboardService.refreshJobRecommendations(mockUserId)).resolves.not.toThrow();

            expect(mockJobMatchingService.getJobMatches).toHaveBeenCalledWith(mockUserId, {
                maxResults: 50,
                excludeApplied: true
            });
        });

        it('should handle errors during refresh', async () => {
            mockJobMatchingService.getJobMatches.mockRejectedValue(new Error('Matching failed'));

            await expect(dashboardService.refreshJobRecommendations(mockUserId))
                .rejects.toThrow('Failed to refresh job recommendations');
        });
    });

    describe('getUserMetrics', () => {
        const mockApplicationsWithDates = [
            {
                id: 'app-1',
                userId: mockUserId,
                jobId: 'job-1',
                status: 'applied' as const,
                appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
                coverLetter: undefined,
                notes: undefined,
                interviewDate: undefined
            },
            {
                id: 'app-2',
                userId: mockUserId,
                jobId: 'job-2',
                status: 'interview' as const,
                appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
                coverLetter: undefined,
                notes: undefined,
                interviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
            }
        ];

        beforeEach(() => {
            mockApplicationRepository.findByUserId.mockResolvedValue(mockApplicationsWithDates);
        });

        it('should calculate user metrics correctly', async () => {
            const result = await dashboardService.getUserMetrics(mockUserId);

            expect(result).toEqual({
                profileCompleteness: expect.any(Number),
                applicationVelocity: expect.any(Number),
                responseRate: expect.any(Number),
                averageTimeToInterview: expect.any(Number),
                topMatchingSkills: ['JavaScript', 'React', 'Node.js']
            });

            expect(result.profileCompleteness).toBeGreaterThan(0);
            expect(result.responseRate).toBe(50); // 1 interview out of 2 applications
        });

        it('should handle zero applications', async () => {
            mockApplicationRepository.findByUserId.mockResolvedValue([]);

            const result = await dashboardService.getUserMetrics(mockUserId);

            expect(result.applicationVelocity).toBe(0);
            expect(result.responseRate).toBe(0);
            expect(result.averageTimeToInterview).toBe(0);
        });
    });

    describe('error handling', () => {
        it('should handle errors in getDashboardData', async () => {
            mockUserProfileRepository.findByUserId.mockRejectedValue(new Error('Database error'));

            await expect(dashboardService.getDashboardData(mockUserId))
                .rejects.toThrow('Failed to generate dashboard data');
        });

        it('should handle errors in getRecentActivity', async () => {
            mockApplicationRepository.findByUserId.mockRejectedValue(new Error('Database error'));

            await expect(dashboardService.getRecentActivity(mockUserId))
                .rejects.toThrow('Failed to get recent activity');
        });

        it('should handle errors in getUpcomingInterviews', async () => {
            mockApplicationRepository.findByUserIdAndStatus.mockRejectedValue(new Error('Database error'));

            await expect(dashboardService.getUpcomingInterviews(mockUserId))
                .rejects.toThrow('Failed to get upcoming interviews');
        });
    });
});