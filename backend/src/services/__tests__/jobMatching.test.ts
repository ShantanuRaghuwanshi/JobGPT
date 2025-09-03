import { JobMatchingService, JobMatch, JobMatchFilters } from '../jobMatching';
import { JobRepository } from '../../database/repositories/job';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { ApplicationRepository } from '../../database/repositories/application';
import { Job, UserProfile, ExperienceLevel, Application } from '../../types/database';

// Mock the repositories
jest.mock('../../database/repositories/job');
jest.mock('../../database/repositories/userProfile');
jest.mock('../../database/repositories/application');
jest.mock('../../config/logger');

describe('JobMatchingService', () => {
    let jobMatchingService: JobMatchingService;
    let mockJobRepository: jest.Mocked<JobRepository>;
    let mockUserProfileRepository: jest.Mocked<UserProfileRepository>;
    let mockApplicationRepository: jest.Mocked<ApplicationRepository>;

    const mockUserId = 'user-123';
    const mockUserProfile: UserProfile = {
        id: 'profile-123',
        userId: mockUserId,
        name: 'John Doe',
        age: 28,
        location: 'San Francisco, CA',
        resumeId: 'resume-123',
        skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python'],
        experienceLevel: 'mid' as ExperienceLevel,
        preferences: {
            locations: ['San Francisco', 'New York', 'Remote'],
            experienceLevels: ['mid', 'senior'],
            keywords: ['frontend', 'fullstack', 'web development'],
            remoteWork: true,
            salaryRange: { min: 80000, max: 120000 }
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockJobs: Job[] = [
        {
            id: 'job-1',
            title: 'Senior Frontend Developer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
            description: 'We are looking for a senior frontend developer with React experience',
            requirements: ['JavaScript', 'React', 'TypeScript', 'CSS'],
            experienceLevel: 'senior' as ExperienceLevel,
            applicationUrl: 'https://techcorp.com/jobs/1',
            isAvailable: true,
            crawledAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'job-2',
            title: 'Full Stack Engineer',
            company: 'StartupXYZ',
            location: 'Remote',
            description: 'Full stack engineer position for web development',
            requirements: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
            experienceLevel: 'mid' as ExperienceLevel,
            applicationUrl: 'https://startupxyz.com/jobs/2',
            isAvailable: true,
            crawledAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'job-3',
            title: 'Python Backend Developer',
            company: 'DataCorp',
            location: 'New York, NY',
            description: 'Backend developer position focusing on Python and APIs',
            requirements: ['Python', 'Django', 'PostgreSQL', 'REST APIs'],
            experienceLevel: 'mid' as ExperienceLevel,
            applicationUrl: 'https://datacorp.com/jobs/3',
            isAvailable: true,
            crawledAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'job-4',
            title: 'Lead Software Engineer',
            company: 'BigTech',
            location: 'Seattle, WA',
            description: 'Lead position for experienced engineers',
            requirements: ['Java', 'Spring', 'Microservices', 'AWS'],
            experienceLevel: 'lead' as ExperienceLevel,
            applicationUrl: 'https://bigtech.com/jobs/4',
            isAvailable: true,
            crawledAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'job-5',
            title: 'Junior Web Developer',
            company: 'WebAgency',
            location: 'Austin, TX',
            description: 'Entry level web developer position',
            requirements: ['HTML', 'CSS', 'JavaScript', 'jQuery'],
            experienceLevel: 'entry' as ExperienceLevel,
            applicationUrl: 'https://webagency.com/jobs/5',
            isAvailable: true,
            crawledAt: new Date(),
            updatedAt: new Date()
        }
    ];

    beforeEach(() => {
        mockJobRepository = new JobRepository() as jest.Mocked<JobRepository>;
        mockUserProfileRepository = new UserProfileRepository() as jest.Mocked<UserProfileRepository>;
        mockApplicationRepository = new ApplicationRepository() as jest.Mocked<ApplicationRepository>;

        jobMatchingService = new JobMatchingService(
            mockJobRepository,
            mockUserProfileRepository,
            mockApplicationRepository
        );

        // Setup default mocks
        mockUserProfileRepository.findByUserId.mockResolvedValue(mockUserProfile);
        mockApplicationRepository.findByUserId.mockResolvedValue([]);
        mockJobRepository.findByFilters.mockResolvedValue(mockJobs);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getJobMatches', () => {
        it('should return job matches sorted by score', async () => {
            const result = await jobMatchingService.getJobMatches(mockUserId);

            expect(result.matches).toBeDefined();
            expect(result.matches.length).toBeGreaterThan(0);
            expect(result.userProfile).toEqual(mockUserProfile);
            expect(result.appliedJobIds).toEqual([]);

            // Check that results are sorted by score (descending)
            for (let i = 1; i < result.matches.length; i++) {
                expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
            }
        });

        it('should exclude applied jobs when excludeApplied is true', async () => {
            const appliedJobs: Application[] = [
                {
                    id: 'app-1',
                    userId: mockUserId,
                    jobId: 'job-1',
                    status: 'applied',
                    appliedAt: new Date()
                }
            ];

            mockApplicationRepository.findByUserId.mockResolvedValue(appliedJobs);

            const result = await jobMatchingService.getJobMatches(mockUserId, {
                excludeApplied: true
            });

            expect(result.appliedJobIds).toEqual(['job-1']);
            expect(result.matches.find(match => match.job.id === 'job-1')).toBeUndefined();
        });

        it('should include applied jobs when excludeApplied is false', async () => {
            const appliedJobs: Application[] = [
                {
                    id: 'app-1',
                    userId: mockUserId,
                    jobId: 'job-1',
                    status: 'applied',
                    appliedAt: new Date()
                }
            ];

            mockApplicationRepository.findByUserId.mockResolvedValue(appliedJobs);

            const result = await jobMatchingService.getJobMatches(mockUserId, {
                excludeApplied: false
            });

            expect(result.matches.find(match => match.job.id === 'job-1')).toBeDefined();
        });

        it('should filter by minimum score', async () => {
            const result = await jobMatchingService.getJobMatches(mockUserId, {
                minScore: 50
            });

            result.matches.forEach(match => {
                expect(match.score).toBeGreaterThanOrEqual(50);
            });
        });

        it('should limit results when maxResults is specified', async () => {
            const result = await jobMatchingService.getJobMatches(mockUserId, {
                maxResults: 2
            });

            expect(result.matches.length).toBeLessThanOrEqual(2);
        });

        it('should throw error when user profile not found', async () => {
            mockUserProfileRepository.findByUserId.mockResolvedValue(null);

            await expect(jobMatchingService.getJobMatches(mockUserId))
                .rejects.toThrow('User profile not found');
        });
    });

    describe('job scoring algorithm', () => {
        it('should give high scores to jobs with perfect skill matches', async () => {
            const perfectMatchJob: Job = {
                ...mockJobs[0],
                title: 'Mid-Level React Developer',
                experienceLevel: 'mid',
                location: 'San Francisco, CA',
                requirements: ['JavaScript', 'React', 'TypeScript'] // Perfect subset of user skills
            };

            mockJobRepository.findByFilters.mockResolvedValue([perfectMatchJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.score).toBeGreaterThan(80);
            expect(match.skillMatches).toContain('JavaScript');
            expect(match.skillMatches).toContain('React');
            expect(match.skillMatches).toContain('TypeScript');
            expect(match.experienceMatch).toBe(true);
            expect(match.locationMatch).toBe(true);
        });

        it('should give lower scores to jobs with experience level mismatch', async () => {
            const mismatchJob: Job = {
                ...mockJobs[0],
                experienceLevel: 'lead', // User is mid-level
                requirements: ['JavaScript', 'React'] // Good skill match
            };

            mockJobRepository.findByFilters.mockResolvedValue([mismatchJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.experienceMatch).toBe(false);
            expect(match.score).toBeLessThan(80); // Should be penalized for experience mismatch but still decent due to skills
        });

        it('should handle remote work preferences correctly', async () => {
            const remoteJob: Job = {
                ...mockJobs[1],
                location: 'Remote',
                experienceLevel: 'mid',
                requirements: ['JavaScript', 'React']
            };

            mockJobRepository.findByFilters.mockResolvedValue([remoteJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.locationMatch).toBe(true);
            expect(match.matchReasons).toContain('Location preference match');
        });

        it('should match keyword preferences', async () => {
            const keywordMatchJob: Job = {
                ...mockJobs[0],
                title: 'Frontend Developer',
                description: 'Fullstack web development position with modern technologies',
                requirements: ['JavaScript']
            };

            mockJobRepository.findByFilters.mockResolvedValue([keywordMatchJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.matchReasons.some(reason =>
                reason.includes('Keyword preferences match')
            )).toBe(true);
        });
    });

    describe('experience level scoring', () => {
        it('should give perfect score for exact experience match', async () => {
            const midLevelJob: Job = {
                ...mockJobs[0],
                experienceLevel: 'mid' // Same as user
            };

            mockJobRepository.findByFilters.mockResolvedValue([midLevelJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.experienceMatch).toBe(true);
        });

        it('should allow applying to lower level positions with reduced score', async () => {
            const entryLevelJob: Job = {
                ...mockJobs[4],
                experienceLevel: 'entry' // Lower than user's mid level
            };

            mockJobRepository.findByFilters.mockResolvedValue([entryLevelJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.score).toBeGreaterThan(0);
            expect(match.score).toBeLessThan(100); // Should be reduced but not zero
        });

        it('should allow applying one level higher with reduced score', async () => {
            const seniorLevelJob: Job = {
                ...mockJobs[0],
                experienceLevel: 'senior' // One level higher than user's mid level
            };

            mockJobRepository.findByFilters.mockResolvedValue([seniorLevelJob]);

            const result = await jobMatchingService.getJobMatches(mockUserId);
            const match = result.matches[0];

            expect(match.score).toBeGreaterThan(0);
            expect(match.experienceMatch).toBe(false);
        });
    });

    describe('getJobRecommendations', () => {
        it('should return limited number of high-quality matches', async () => {
            const result = await jobMatchingService.getJobRecommendations(mockUserId, 3);

            expect(result.length).toBeLessThanOrEqual(3);
            result.forEach(match => {
                expect(match.score).toBeGreaterThanOrEqual(30);
            });
        });
    });

    describe('getSimilarJobs', () => {
        it('should return similar jobs to a target job', async () => {
            const targetJobId = 'job-1';
            mockJobRepository.findById.mockResolvedValue(mockJobs[0]);

            const result = await jobMatchingService.getSimilarJobs(targetJobId, mockUserId, 3);

            expect(result.length).toBeLessThanOrEqual(3);
            expect(result.find(match => match.job.id === targetJobId)).toBeUndefined();
        });

        it('should throw error when target job not found', async () => {
            mockJobRepository.findById.mockResolvedValue(null);

            await expect(jobMatchingService.getSimilarJobs('nonexistent', mockUserId))
                .rejects.toThrow('Job not found');
        });
    });

    describe('getMatchStatistics', () => {
        it('should return comprehensive match statistics', async () => {
            const result = await jobMatchingService.getMatchStatistics(mockUserId);

            expect(result).toHaveProperty('totalMatches');
            expect(result).toHaveProperty('highQualityMatches');
            expect(result).toHaveProperty('mediumQualityMatches');
            expect(result).toHaveProperty('lowQualityMatches');
            expect(result).toHaveProperty('averageScore');
            expect(result).toHaveProperty('topSkillMatches');
            expect(result).toHaveProperty('preferredLocationsAvailable');

            expect(typeof result.totalMatches).toBe('number');
            expect(typeof result.averageScore).toBe('number');
            expect(Array.isArray(result.topSkillMatches)).toBe(true);
        });
    });

    describe('filtering', () => {
        it('should filter by experience levels', async () => {
            const filters: JobMatchFilters = {
                experienceLevels: ['senior', 'lead']
            };

            const result = await jobMatchingService.getJobMatches(mockUserId, filters);

            result.matches.forEach(match => {
                expect(['senior', 'lead']).toContain(match.job.experienceLevel);
            });
        });

        it('should filter by locations', async () => {
            const filters: JobMatchFilters = {
                locations: ['San Francisco', 'Remote']
            };

            const result = await jobMatchingService.getJobMatches(mockUserId, filters);

            result.matches.forEach(match => {
                const location = match.job.location.toLowerCase();
                expect(
                    location.includes('san francisco') || location.includes('remote')
                ).toBe(true);
            });
        });

        it('should filter by keywords', async () => {
            const filters: JobMatchFilters = {
                keywords: ['frontend', 'react']
            };

            const result = await jobMatchingService.getJobMatches(mockUserId, filters);

            result.matches.forEach(match => {
                const jobText = `${match.job.title} ${match.job.description} ${match.job.company}`.toLowerCase();
                expect(
                    jobText.includes('frontend') || jobText.includes('react')
                ).toBe(true);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle user with no skills', async () => {
            const userWithNoSkills: UserProfile = {
                ...mockUserProfile,
                skills: []
            };

            mockUserProfileRepository.findByUserId.mockResolvedValue(userWithNoSkills);

            const result = await jobMatchingService.getJobMatches(mockUserId);

            expect(result.matches).toBeDefined();
            result.matches.forEach(match => {
                expect(match.skillMatches).toEqual([]);
            });
        });

        it('should handle jobs with no requirements', async () => {
            const jobsWithNoRequirements = mockJobs.map(job => ({
                ...job,
                requirements: []
            }));

            mockJobRepository.findByFilters.mockResolvedValue(jobsWithNoRequirements);

            const result = await jobMatchingService.getJobMatches(mockUserId);

            expect(result.matches).toBeDefined();
            result.matches.forEach(match => {
                expect(match.skillMatches).toEqual([]);
            });
        });

        it('should handle user with no location preferences', async () => {
            const userWithNoLocationPrefs: UserProfile = {
                ...mockUserProfile,
                preferences: {
                    ...mockUserProfile.preferences,
                    locations: []
                }
            };

            mockUserProfileRepository.findByUserId.mockResolvedValue(userWithNoLocationPrefs);

            const result = await jobMatchingService.getJobMatches(mockUserId);

            expect(result.matches).toBeDefined();
            // Should still return matches with neutral location scores
        });

        it('should handle empty job list', async () => {
            mockJobRepository.findByFilters.mockResolvedValue([]);

            const result = await jobMatchingService.getJobMatches(mockUserId);

            expect(result.matches).toEqual([]);
            expect(result.total).toBe(0);
        });
    });
});