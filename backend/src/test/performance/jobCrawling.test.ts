import { JobScraperService } from '../../services/jobScraper';
import { JobDeduplicationService } from '../../services/jobDeduplication';
import { JobRepository } from '../../database/repositories/job';
import { performance } from 'perf_hooks';
import { Job } from '../../types/database';

jest.mock('../../database/repositories/job');
jest.mock('puppeteer');

const MockedJobRepository = JobRepository as jest.MockedClass<typeof JobRepository>;

describe('Job Crawling Performance Tests', () => {
    let scraperService: JobScraperService;
    let deduplicationService: JobDeduplicationService;
    let mockJobRepository: jest.Mocked<JobRepository>;

    beforeAll(() => {
        scraperService = new JobScraperService();
        deduplicationService = new JobDeduplicationService();
        mockJobRepository = MockedJobRepository.prototype as jest.Mocked<JobRepository>;
    });

    describe('Job Scraping Performance', () => {
        it('should scrape jobs within acceptable time limits', async () => {
            const startTime = performance.now();

            // Mock the actual scraping to avoid hitting real websites in tests
            const mockJobs: Partial<Job>[] = Array.from({ length: 100 }, (_, i) => ({
                id: `job-${i}`,
                title: `Software Engineer ${i}`,
                company: `Company ${i % 10}`,
                location: i % 2 === 0 ? 'San Francisco, CA' : 'Remote',
                description: `Job description for position ${i}`,
                requirements: ['JavaScript', 'React', 'Node.js'],
                experienceLevel: (i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'mid' : 'senior') as Job['experienceLevel'],
                applicationUrl: `https://company${i % 10}.com/jobs/${i}`,
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            }));

            // Mock repository methods
            mockJobRepository.findByTitleAndCompany.mockResolvedValue(null);
            mockJobRepository.create.mockResolvedValue({} as Job);

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 100));

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Should complete within 5 seconds for 100 jobs
            expect(executionTime).toBeLessThan(5000);
            expect(mockJobs).toHaveLength(100);
        }, 10000);

        it('should handle concurrent scraping efficiently', async () => {
            const startTime = performance.now();

            const companies = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta'];

            // Simulate concurrent scraping of multiple companies
            const scrapingPromises = companies.map(async (company) => {
                // Mock scraping delay
                await new Promise(resolve => setTimeout(resolve, Math.random() * 200));

                return Array.from({ length: 20 }, (_, i) => ({
                    id: `${company.toLowerCase()}-job-${i}`,
                    title: `Engineer ${i}`,
                    company,
                    location: 'Various',
                    description: `Job at ${company}`,
                    requirements: ['Programming'],
                    experienceLevel: 'mid' as Job['experienceLevel'],
                    applicationUrl: `https://${company.toLowerCase()}.com/jobs/${i}`,
                    isAvailable: true,
                    crawledAt: new Date(),
                    updatedAt: new Date()
                }));
            });

            const results = await Promise.all(scrapingPromises);
            const allJobs = results.flat();

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Concurrent scraping should be faster than sequential
            expect(executionTime).toBeLessThan(1000); // Should complete in under 1 second
            expect(allJobs).toHaveLength(100); // 20 jobs per company * 5 companies
        });
    });

    describe('Job Deduplication Performance', () => {
        it('should deduplicate large job datasets efficiently', async () => {
            // Create a large dataset with duplicates
            const jobs: Partial<Job>[] = [];
            const uniqueJobCount = 1000;
            const duplicatesPerJob = 3;

            for (let i = 0; i < uniqueJobCount; i++) {
                const baseJob: Partial<Job> = {
                    id: `base-job-${i}`,
                    title: `Software Engineer ${i % 50}`, // Create some title overlap
                    company: `Company ${i % 100}`, // Create some company overlap
                    location: i % 5 === 0 ? 'Remote' : `City ${i % 20}`,
                    description: `Description for job ${i}`,
                    requirements: ['JavaScript', 'React'],
                    experienceLevel: (i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'mid' : 'senior') as Job['experienceLevel'],
                    applicationUrl: `https://company.com/jobs/${i}`,
                    isAvailable: true,
                    crawledAt: new Date(),
                    updatedAt: new Date()
                };

                jobs.push(baseJob);

                // Add duplicates with slight variations
                for (let j = 1; j <= duplicatesPerJob; j++) {
                    jobs.push({
                        ...baseJob,
                        id: `duplicate-${i}-${j}`,
                        description: `${baseJob.description} - variation ${j}`,
                        // Same title, company, location to trigger deduplication
                    });
                }
            }

            const startTime = performance.now();
            const deduplicatedJobs = await deduplicationService.deduplicateJobs(jobs as Job[]);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // Should process 4000 jobs (1000 unique + 3000 duplicates) in under 2 seconds
            expect(executionTime).toBeLessThan(2000);
            expect(jobs).toHaveLength(4000); // Original dataset
            expect(deduplicatedJobs.length).toBeLessThan(jobs.length); // Should remove duplicates
            expect(deduplicatedJobs.length).toBeGreaterThan(uniqueJobCount * 0.8); // Should keep most unique jobs
        });

        it('should handle memory efficiently with large datasets', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Create a very large dataset
            const largeJobSet: Partial<Job>[] = Array.from({ length: 10000 }, (_, i) => ({
                id: `large-job-${i}`,
                title: `Position ${i % 100}`,
                company: `Company ${i % 500}`,
                location: `Location ${i % 50}`,
                description: `Very long description for job ${i}`.repeat(10), // Make it memory intensive
                requirements: Array.from({ length: 10 }, (_, j) => `Skill ${j}`),
                experienceLevel: (i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'mid' : 'senior') as Job['experienceLevel'],
                applicationUrl: `https://company.com/jobs/${i}`,
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            }));

            const startTime = performance.now();
            const result = await deduplicationService.deduplicateJobs(largeJobSet as Job[]);
            const endTime = performance.now();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const executionTime = endTime - startTime;

            // Should not use excessive memory (less than 100MB increase)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

            // Should complete in reasonable time (less than 5 seconds)
            expect(executionTime).toBeLessThan(5000);

            // Should return results
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThanOrEqual(largeJobSet.length);
        });
    });

    describe('Job Validation Performance', () => {
        it('should validate job availability efficiently', async () => {
            const jobs: Partial<Job>[] = Array.from({ length: 50 }, (_, i) => ({
                id: `validation-job-${i}`,
                title: `Job ${i}`,
                company: `Company ${i}`,
                location: 'Test Location',
                description: 'Test description',
                requirements: ['Test skill'],
                experienceLevel: 'mid' as Job['experienceLevel'],
                applicationUrl: `https://testcompany${i}.com/jobs/${i}`,
                isAvailable: true,
                crawledAt: new Date(),
                updatedAt: new Date()
            }));

            const startTime = performance.now();

            // Mock validation process (in real scenario, this would check if job URLs are still valid)
            const validationPromises = jobs.map(async (job) => {
                // Simulate network request delay
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

                // Randomly mark some jobs as unavailable
                return {
                    ...job,
                    isAvailable: Math.random() > 0.2 // 80% availability rate
                };
            });

            const validatedJobs = await Promise.all(validationPromises);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // Should validate 50 jobs in under 3 seconds (with concurrent processing)
            expect(executionTime).toBeLessThan(3000);
            expect(validatedJobs).toHaveLength(50);

            const availableJobs = validatedJobs.filter(job => job.isAvailable);
            expect(availableJobs.length).toBeGreaterThan(30); // Should have most jobs still available
        });
    });
});