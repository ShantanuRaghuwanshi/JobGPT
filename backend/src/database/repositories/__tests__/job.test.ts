import { JobRepository } from '../job';
import { Job, JobFilters } from '../../../types/database';

// Mock the database connection
jest.mock('../../connection', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

describe('JobRepository', () => {
    let jobRepository: JobRepository;
    let mockQuery: jest.Mock;

    beforeEach(() => {
        jobRepository = new JobRepository();
        mockQuery = require('../../connection').query;
        mockQuery.mockClear();
    });

    describe('mapRowToEntity', () => {
        it('should correctly map database row to Job entity', () => {
            const row = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great job opportunity',
                requirements: ['JavaScript', 'React'],
                experience_level: 'mid' as const,
                application_url: 'https://example.com/apply',
                is_available: true,
                crawled_at: new Date('2023-01-01'),
                updated_at: new Date('2023-01-02'),
            };

            const job = jobRepository['mapRowToEntity'](row);

            expect(job).toEqual({
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great job opportunity',
                requirements: ['JavaScript', 'React'],
                experienceLevel: 'mid',
                applicationUrl: 'https://example.com/apply',
                isAvailable: true,
                crawledAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-02'),
            });
        });
    });

    describe('findWithFilters', () => {
        it('should build correct query with multiple filters', async () => {
            const filters: JobFilters = {
                keywords: 'React',
                location: 'San Francisco',
                experienceLevel: 'mid',
                company: 'Tech',
                isAvailable: true,
                limit: 10,
                offset: 0,
            };

            mockQuery.mockResolvedValue({ rows: [] });

            await jobRepository.findWithFilters(filters);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM jobs WHERE 1=1'),
                ['%React%', '%San Francisco%', 'mid', '%Tech%', true, 10, 0]
            );
        });

        it('should handle empty filters', async () => {
            const filters: JobFilters = {};

            mockQuery.mockResolvedValue({ rows: [] });

            await jobRepository.findWithFilters(filters);

            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM jobs WHERE 1=1 ORDER BY updated_at DESC',
                []
            );
        });
    });

    describe('findDuplicateJob', () => {
        it('should find duplicate job', async () => {
            const mockRow = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                description: 'Great job opportunity',
                requirements: ['JavaScript', 'React'],
                experience_level: 'mid' as const,
                application_url: 'https://example.com/apply',
                is_available: true,
                crawled_at: new Date('2023-01-01'),
                updated_at: new Date('2023-01-02'),
            };

            mockQuery.mockResolvedValue({ rows: [mockRow] });

            const result = await jobRepository.findDuplicateJob(
                'Software Engineer',
                'Tech Corp',
                'https://example.com/apply'
            );

            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM jobs WHERE title = $1 AND company = $2 AND application_url = $3',
                ['Software Engineer', 'Tech Corp', 'https://example.com/apply']
            );
            expect(result).not.toBeNull();
            expect(result?.title).toBe('Software Engineer');
        });

        it('should return null when no duplicate found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await jobRepository.findDuplicateJob(
                'Software Engineer',
                'Tech Corp',
                'https://example.com/apply'
            );

            expect(result).toBeNull();
        });
    });

    describe('getJobStats', () => {
        it('should return job statistics', async () => {
            mockQuery.mockResolvedValue({
                rows: [{
                    total: '100',
                    available: '80',
                    companies: '25',
                }]
            });

            const stats = await jobRepository.getJobStats();

            expect(stats).toEqual({
                total: 100,
                available: 80,
                companies: 25,
            });
        });
    });
});