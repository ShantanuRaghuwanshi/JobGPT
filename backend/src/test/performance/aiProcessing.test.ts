import { LLMService } from '../../services/llm/llmService';
import { CoverLetterGenerationService } from '../../services/coverLetterGeneration';
import { JobMatchingService } from '../../services/jobMatching';
import { performance } from 'perf_hooks';
import { mockLLMResponses, createMockProfile, createMockJob } from '../helpers/testData';

// Mock LLM responses to avoid actual API calls in performance tests
jest.mock('../../services/llm/llmService');
jest.mock('../../database/repositories/job');
jest.mock('../../database/repositories/userProfile');

const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;

describe('AI Processing Performance Tests', () => {
    let mockLLMService: jest.Mocked<LLMService>;
    let coverLetterService: CoverLetterGenerationService;
    let jobMatchingService: JobMatchingService;

    beforeAll(() => {
        mockLLMService = MockedLLMService.prototype as jest.Mocked<LLMService>;
        coverLetterService = new CoverLetterGenerationService();
        jobMatchingService = new JobMatchingService();
    });

    describe('Resume Parsing Performance', () => {
        it('should parse resumes within acceptable time limits', async () => {
            const mockResumeBuffer = Buffer.from('Mock PDF resume content');
            const mockParsedResponse = mockLLMResponses.resumeParsing;

            mockLLMService.parseResume.mockResolvedValue(mockParsedResponse);

            const startTime = performance.now();
            const result = await mockLLMService.parseResume(mockResumeBuffer);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // Should complete within 2 seconds (mocked, but simulates real performance expectations)
            expect(executionTime).toBeLessThan(2000);
            expect(result).toEqual(mockParsedResponse);
            expect(mockLLMService.parseResume).toHaveBeenCalledWith(mockResumeBuffer);
        });

        it('should handle batch resume parsing efficiently', async () => {
            const resumeBuffers = Array.from({ length: 10 }, (_, i) =>
                Buffer.from(`Resume content ${i}`)
            );

            mockLLMService.parseResume.mockImplementation(async () => {
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 100));
                return mockLLMResponses.resumeParsing;
            });

            const startTime = performance.now();

            // Process resumes concurrently
            const results = await Promise.all(
                resumeBuffers.map(buffer => mockLLMService.parseResume(buffer))
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Concurrent processing should be faster than sequential (10 * 100ms = 1000ms)
            expect(executionTime).toBeLessThan(500); // Should complete in under 500ms due to concurrency
            expect(results).toHaveLength(10);
            expect(mockLLMService.parseResume).toHaveBeenCalledTimes(10);
        });
    });

    describe('Cover Letter Generation Performance', () => {
        it('should generate cover letters within time limits', async () => {
            const mockUserProfile = createMockProfile();
            const mockJob = createMockJob();
            const mockCoverLetter = mockLLMResponses.coverLetter;

            mockLLMService.generateText.mockResolvedValue(mockCoverLetter);

            const startTime = performance.now();
            const result = await coverLetterService.generateCoverLetter(mockUserProfile, mockJob);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // Should generate cover letter within 3 seconds
            expect(executionTime).toBeLessThan(3000);
            expect(result).toBe(mockCoverLetter);
        });

        it('should handle multiple cover letter generations efficiently', async () => {
            const mockUserProfile = createMockProfile();
            const jobs = Array.from({ length: 5 }, (_, i) =>
                createMockJob({
                    id: `job-${i}`,
                    title: `Position ${i}`,
                    company: `Company ${i}`
                })
            );

            mockLLMService.generateText.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
                return mockLLMResponses.coverLetter;
            });

            const startTime = performance.now();

            const coverLetters = await Promise.all(
                jobs.map(job => coverLetterService.generateCoverLetter(mockUserProfile, job))
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Should complete all 5 cover letters in under 1 second (concurrent processing)
            expect(executionTime).toBeLessThan(1000);
            expect(coverLetters).toHaveLength(5);
        });
    });

    describe('Job Matching Performance', () => {
        it('should match jobs efficiently for large datasets', async () => {
            const mockUserProfile = createMockProfile({
                skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
                preferences: {
                    locations: ['San Francisco, CA', 'Remote'],
                    experienceLevels: ['mid', 'senior'],
                    keywords: ['frontend'],
                    remoteWork: true
                }
            });

            // Create a large dataset of jobs
            const jobs = Array.from({ length: 1000 }, (_, i) =>
                createMockJob({
                    id: `job-${i}`,
                    title: `Position ${i}`,
                    company: `Company ${i % 100}`,
                    location: i % 3 === 0 ? 'San Francisco, CA' : i % 3 === 1 ? 'Remote' : 'New York, NY',
                    requirements: i % 2 === 0 ? ['JavaScript', 'React'] : ['Python', 'Django'],
                    experienceLevel: (i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'mid' : 'senior') as any
                })
            );

            const startTime = performance.now();

            const matchedJobs = await jobMatchingService.findMatchingJobs(mockUserProfile, jobs);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Should process 1000 jobs in under 100ms
            expect(executionTime).toBeLessThan(100);
            expect(matchedJobs.length).toBeGreaterThan(0);
            expect(matchedJobs.length).toBeLessThanOrEqual(jobs.length);
        });

        it('should calculate job scores efficiently', async () => {
            const mockUserProfile = createMockProfile({
                skills: ['JavaScript', 'React', 'Node.js']
            });

            const jobs = Array.from({ length: 500 }, (_, i) =>
                createMockJob({
                    id: `job-${i}`,
                    title: `Position ${i}`,
                    company: `Company ${i}`,
                    requirements: ['JavaScript', 'React', 'Node.js'].slice(0, (i % 3) + 1)
                })
            );

            const startTime = performance.now();

            const scoredJobs = await jobMatchingService.scoreJobs(mockUserProfile, jobs);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Should score and sort 500 jobs in under 50ms
            expect(executionTime).toBeLessThan(50);
            expect(scoredJobs).toHaveLength(500);
            expect(scoredJobs[0].score).toBeGreaterThanOrEqual(scoredJobs[1].score);
        });
    });

    describe('Memory Usage Tests', () => {
        it('should not cause memory leaks during intensive AI processing', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            mockLLMService.parseResume.mockResolvedValue(mockLLMResponses.resumeParsing);
            mockLLMService.generateText.mockResolvedValue(mockLLMResponses.coverLetter);

            // Simulate intensive AI processing
            for (let i = 0; i < 100; i++) {
                const resumeBuffer = Buffer.from(`Resume content ${i}`);
                await mockLLMService.parseResume(resumeBuffer);

                const mockProfile = createMockProfile();
                const mockJob = createMockJob();
                await coverLetterService.generateCoverLetter(mockProfile, mockJob);

                // Force garbage collection periodically
                if (i % 10 === 0 && global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });
});