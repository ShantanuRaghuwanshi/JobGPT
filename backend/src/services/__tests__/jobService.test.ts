import { JobService, JobFilters } from '../jobService';
import { JobRepository } from '../../database/repositories/job';
import { Job } from '../../types/database';

// Mock logger
jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('JobService', () => {
    let jobService: JobService;
    let mockJobRepository: jest.Mocked<JobRepository>;

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

    beforeEach(() => {
        mockJobRepository = {
            findByFilters: jest.fn(),
            countByFilters: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
        } as any;

        jobService = new JobService(mockJobRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getJobs', () => {
        it('should return jobs with pagination info', async () => {
            const mockJobs = [mockJob];
            mockJobRepository.findByFilters.mockResolvedValue(mockJobs);
            mockJobRepository.countByFilters.mockResolvedValue(1);

            const filters: JobFilters = {
                title: 'Software',
                limit: 10,
                offset: 0
            };

            const result = await jobService.getJobs(filters);

            expect(result).toEqual({
                jobs: mockJobs,
                total: 1,
                hasMore: false
            });

            expect(mockJobRepository.findByFilters).toHaveBeenCalledWith(
                {
                    isAvailable: true,
                    title: { contains: 'Software', caseSensitive: false }
                },
                {
                    limit: 10,
                    offset: 0,
                    orderBy: { updatedAt: 'desc' }
                }
            );
        });

        it('should use default filters when none provided', async () => {
            mockJobRepository.findByFilters.mockResolvedValue([]);
            mockJobRepository.countByFilters.mockResolvedValue(0);

            await jobService.getJobs();

            expect(mockJobRepository.findByFilters).toHaveBeenCalledWith(
                { isAvailable: true },
                {
                    limit: 20,
                    offset: 0,
                    orderBy: { updatedAt: 'desc' }
                }
            );
        });

        it('should handle skills filter', async () => {
            mockJobRepository.findByFilters.mockResolvedValue([]);
            mockJobRepository.countByFilters.mockResolvedValue(0);

            const filters: JobFilters = {
                skills: ['JavaScript', 'React']
            };

            await jobService.getJobs(filters);

            expect(mockJobRepository.findByFilters).toHaveBeenCalledWith(
                {
                    isAvailable: true,
                    requirements: { containsAny: ['JavaScript', 'React'] }
                },
                {
                    limit: 20,
                    offset: 0,
                    orderBy: { updatedAt: 'desc' }
                }
            );
        });

        it('should calculate hasMore correctly', async () => {
            const mockJobs = [mockJob];
            mockJobRepository.findByFilters.mockResolvedValue(mockJobs);
            mockJobRepository.countByFilters.mockResolvedValue(25);

            const result = await jobService.getJobs({ limit: 10, offset: 10 });

            expect(result.hasMore).toBe(true);
        });

        it('should handle repository errors', async () => {
            mockJobRepository.findByFilters.mockRejectedValue(new Error('Database error'));

            await expect(jobService.getJobs()).rejects.toThrow('Failed to retrieve jobs');
        });
    });

    describe('getJobById', () => {
        it('should return job when found', async () => {
            mockJobRepository.findById.mockResolvedValue(mockJob);

            const result = await jobService.getJobById('123');

            expect(result).toBe(mockJob);
            expect(mockJobRepository.findById).toHaveBeenCalledWith('123');
        });

        it('should return null when job not found', async () => {
            mockJobRepository.findById.mockResolvedValue(null);

            const result = await jobService.getJobById('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle repository errors', async () => {
            mockJobRepository.findById.mockRejectedValue(new Error('Database error'));

            await expect(jobService.getJobById('123')).rejects.toThrow('Failed to retrieve job');
        });
    });

    describe('searchJobs', () => {
        it('should search jobs by title and company', async () => {
            const titleJobs = [mockJob];
            const companyJobs = [
                {
                    ...mockJob,
                    id: '456',
                    title: 'Frontend Developer',
                    company: 'Software Corp'
                }
            ];

            // Mock the getJobs calls for title and company searches
            jest.spyOn(jobService, 'getJobs')
                .mockResolvedValueOnce({ jobs: titleJobs, total: 1, hasMore: false })
                .mockResolvedValueOnce({ jobs: companyJobs, total: 1, hasMore: false });

            const result = await jobService.searchJobs('Software');

            expect(result.jobs).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should deduplicate results', async () => {
            const duplicateJob = mockJob;

            jest.spyOn(jobService, 'getJobs')
                .mockResolvedValueOnce({ jobs: [duplicateJob], total: 1, hasMore: false })
                .mockResolvedValueOnce({ jobs: [duplicateJob], total: 1, hasMore: false });

            const result = await jobService.searchJobs('Software');

            expect(result.jobs).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('should sort results with title matches first', async () => {
            const titleMatch = { ...mockJob, id: '1', title: 'Software Engineer' };
            const companyMatch = { ...mockJob, id: '2', title: 'Developer', company: 'Software Corp' };

            // Mock the getJobs calls for title and company searches
            const getJobsSpy = jest.spyOn(jobService, 'getJobs');
            getJobsSpy
                .mockResolvedValueOnce({ jobs: [titleMatch], total: 1, hasMore: false }) // title search
                .mockResolvedValueOnce({ jobs: [companyMatch], total: 1, hasMore: false }); // company search

            const result = await jobService.searchJobs('Software');

            expect(result.jobs[0].id).toBe('1'); // Title match should come first
            expect(result.jobs[1].id).toBe('2'); // Company match should come second
        });
    });

    describe('markJobUnavailable', () => {
        it('should mark job as unavailable', async () => {
            const updatedJob = { ...mockJob, isAvailable: false };
            mockJobRepository.findById.mockResolvedValue(mockJob);
            mockJobRepository.update.mockResolvedValue(updatedJob);

            const result = await jobService.markJobUnavailable('123');

            expect(result).toBe(updatedJob);
            expect(mockJobRepository.update).toHaveBeenCalledWith('123', {
                isAvailable: false,
                updatedAt: expect.any(Date)
            });
        });

        it('should return null when job not found', async () => {
            mockJobRepository.findById.mockResolvedValue(null);

            const result = await jobService.markJobUnavailable('nonexistent');

            expect(result).toBeNull();
            expect(mockJobRepository.update).not.toHaveBeenCalled();
        });

        it('should handle repository errors', async () => {
            mockJobRepository.findById.mockRejectedValue(new Error('Database error'));

            await expect(jobService.markJobUnavailable('123')).rejects.toThrow('Failed to mark job as unavailable');
        });
    });

    describe('markJobAvailable', () => {
        it('should mark job as available', async () => {
            const unavailableJob = { ...mockJob, isAvailable: false };
            const updatedJob = { ...mockJob, isAvailable: true };
            mockJobRepository.findById.mockResolvedValue(unavailableJob);
            mockJobRepository.update.mockResolvedValue(updatedJob);

            const result = await jobService.markJobAvailable('123');

            expect(result).toBe(updatedJob);
            expect(mockJobRepository.update).toHaveBeenCalledWith('123', {
                isAvailable: true,
                updatedAt: expect.any(Date)
            });
        });

        it('should return null when job not found', async () => {
            mockJobRepository.findById.mockResolvedValue(null);

            const result = await jobService.markJobAvailable('nonexistent');

            expect(result).toBeNull();
            expect(mockJobRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('getJobStats', () => {
        it('should return job statistics', async () => {
            mockJobRepository.countByFilters
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(80)  // available
                .mockResolvedValueOnce(20)  // unavailable
                .mockResolvedValueOnce(10)  // entry
                .mockResolvedValueOnce(40)  // mid
                .mockResolvedValueOnce(35)  // senior
                .mockResolvedValueOnce(15)  // lead
                .mockResolvedValueOnce(5);  // recently added

            const result = await jobService.getJobStats();

            expect(result).toEqual({
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
            });
        });

        it('should handle repository errors', async () => {
            mockJobRepository.countByFilters.mockRejectedValue(new Error('Database error'));

            await expect(jobService.getJobStats()).rejects.toThrow('Failed to retrieve job statistics');
        });
    });

    describe('getJobsByCompany', () => {
        it('should get jobs by company', async () => {
            const mockJobs = [mockJob];
            jest.spyOn(jobService, 'getJobs').mockResolvedValue({
                jobs: mockJobs,
                total: 1,
                hasMore: false
            });

            const result = await jobService.getJobsByCompany('Tech Corp');

            expect(jobService.getJobs).toHaveBeenCalledWith({
                company: 'Tech Corp'
            });
            expect(result.jobs).toBe(mockJobs);
        });
    });

    describe('getJobsByExperienceLevel', () => {
        it('should get jobs by experience level', async () => {
            const mockJobs = [mockJob];
            jest.spyOn(jobService, 'getJobs').mockResolvedValue({
                jobs: mockJobs,
                total: 1,
                hasMore: false
            });

            const result = await jobService.getJobsByExperienceLevel('mid');

            expect(jobService.getJobs).toHaveBeenCalledWith({
                experienceLevel: 'mid'
            });
            expect(result.jobs).toBe(mockJobs);
        });
    });

    describe('getJobsByLocation', () => {
        it('should get jobs by location', async () => {
            const mockJobs = [mockJob];
            jest.spyOn(jobService, 'getJobs').mockResolvedValue({
                jobs: mockJobs,
                total: 1,
                hasMore: false
            });

            const result = await jobService.getJobsByLocation('San Francisco');

            expect(jobService.getJobs).toHaveBeenCalledWith({
                location: 'San Francisco'
            });
            expect(result.jobs).toBe(mockJobs);
        });
    });
});