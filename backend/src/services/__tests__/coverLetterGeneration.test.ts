import { CoverLetterGenerationService, CoverLetterRequest, CoverLetterResult } from '../coverLetterGeneration';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { JobRepository } from '../../database/repositories/job';
import { llmService } from '../llm/llmService';
import { UserProfile, Job } from '../../types/database';
import { promises as fs } from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('../../database/repositories/userProfile');
jest.mock('../../database/repositories/job');
jest.mock('../llm/llmService');
jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
        readdir: jest.fn()
    }
}));
jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('CoverLetterGenerationService', () => {
    let service: CoverLetterGenerationService;
    let mockUserProfileRepo: jest.Mocked<UserProfileRepository>;
    let mockJobRepo: jest.Mocked<JobRepository>;
    let mockLlmService: jest.Mocked<typeof llmService>;
    let mockFs: jest.Mocked<typeof fs>;

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
        description: 'We are looking for a skilled frontend developer...',
        requirements: ['React', 'JavaScript', '3+ years experience'],
        experienceLevel: 'mid',
        applicationUrl: 'https://example.com/apply',
        isAvailable: true,
        crawledAt: new Date(),
        updatedAt: new Date()
    };

    const mockCoverLetterRequest: CoverLetterRequest = {
        userId: 'user-1',
        jobId: 'job-1',
        tone: 'professional',
        length: 'medium',
        customInstructions: 'Emphasize my React experience'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup repository mocks
        mockUserProfileRepo = new UserProfileRepository() as jest.Mocked<UserProfileRepository>;
        mockJobRepo = new JobRepository() as jest.Mocked<JobRepository>;
        mockLlmService = llmService as jest.Mocked<typeof llmService>;
        mockFs = fs as jest.Mocked<typeof fs>;

        // Create service instance with test storage directory
        service = new CoverLetterGenerationService('./test-storage');

        // Inject mocked repositories
        (service as any).userProfileRepo = mockUserProfileRepo;
        (service as any).jobRepo = mockJobRepo;

        // Setup default mocks
        mockFs.mkdir.mockResolvedValue(undefined);
    });

    describe('generateCoverLetter', () => {
        beforeEach(() => {
            mockLlmService.isConfigured.mockReturnValue(true);
            mockLlmService.getConfig.mockReturnValue({
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                apiKey: 'test-key'
            });
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockJobRepo.findById.mockResolvedValue(mockJob);
        });

        it('should generate cover letter successfully', async () => {
            const mockGeneratedLetter = 'Dear Hiring Manager,\n\nI am excited to apply for the Frontend Developer position...';
            mockLlmService.generateCoverLetter.mockResolvedValue(mockGeneratedLetter);

            const result = await service.generateCoverLetter(mockCoverLetterRequest);

            expect(result.success).toBe(true);
            expect(result.coverLetter).toBe('Dear Hiring Manager,\n\nI am excited to apply for the Frontend Developer position...');
            expect(result.metadata).toEqual({
                wordCount: expect.any(Number),
                generatedAt: expect.any(Date),
                llmProvider: 'openai',
                jobTitle: 'Frontend Developer',
                company: 'Tech Corp'
            });
        });

        it('should return error when LLM service is not configured', async () => {
            mockLlmService.isConfigured.mockReturnValue(false);

            const result = await service.generateCoverLetter(mockCoverLetterRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('LLM service is not configured. Please set up your AI model configuration.');
        });

        it('should return error when user profile not found', async () => {
            mockUserProfileRepo.findByUserId.mockResolvedValue(null);

            const result = await service.generateCoverLetter(mockCoverLetterRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User profile not found');
        });

        it('should return error when job not found', async () => {
            mockJobRepo.findById.mockResolvedValue(null);

            const result = await service.generateCoverLetter(mockCoverLetterRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Job not found');
        });

        it('should handle LLM service errors gracefully', async () => {
            mockLlmService.generateCoverLetter.mockRejectedValue(new Error('LLM API error'));

            const result = await service.generateCoverLetter(mockCoverLetterRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('LLM API error');
        });

        it('should enhance job description with custom instructions', async () => {
            const mockGeneratedLetter = 'Test cover letter';
            mockLlmService.generateCoverLetter.mockResolvedValue(mockGeneratedLetter);

            await service.generateCoverLetter(mockCoverLetterRequest);

            expect(mockLlmService.generateCoverLetter).toHaveBeenCalledWith(
                expect.any(Object),
                expect.stringContaining('Tone: Please write the cover letter in a professional tone.')
            );
            expect(mockLlmService.generateCoverLetter).toHaveBeenCalledWith(
                expect.any(Object),
                expect.stringContaining('Length: Write a standard cover letter, around 250-350 words.')
            );
            expect(mockLlmService.generateCoverLetter).toHaveBeenCalledWith(
                expect.any(Object),
                expect.stringContaining('Additional Instructions: Emphasize my React experience')
            );
        });
    });

    describe('storeCoverLetter', () => {
        it('should store cover letter successfully', async () => {
            const mockResult: CoverLetterResult = {
                success: true,
                coverLetter: 'Test cover letter content',
                metadata: {
                    wordCount: 4,
                    generatedAt: new Date(),
                    llmProvider: 'openai',
                    jobTitle: 'Frontend Developer',
                    company: 'Tech Corp'
                }
            };

            const coverLetterId = await service.storeCoverLetter('user-1', 'job-1', mockResult);

            expect(coverLetterId).toMatch(/^user-1-job-1-\d+$/);
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(`${coverLetterId}.json`),
                expect.stringContaining('Test cover letter content'),
                'utf-8'
            );
        });

        it('should return null for unsuccessful result', async () => {
            const mockResult: CoverLetterResult = {
                success: false,
                error: 'Generation failed'
            };

            const coverLetterId = await service.storeCoverLetter('user-1', 'job-1', mockResult);

            expect(coverLetterId).toBeNull();
            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should handle file system errors', async () => {
            const mockResult: CoverLetterResult = {
                success: true,
                coverLetter: 'Test content',
                metadata: {
                    wordCount: 2,
                    generatedAt: new Date(),
                    llmProvider: 'openai',
                    jobTitle: 'Test Job',
                    company: 'Test Company'
                }
            };

            mockFs.writeFile.mockRejectedValue(new Error('File system error'));

            const coverLetterId = await service.storeCoverLetter('user-1', 'job-1', mockResult);

            expect(coverLetterId).toBeNull();
        });
    });

    describe('retrieveCoverLetter', () => {
        it('should retrieve cover letter successfully', async () => {
            const mockStoredLetter = {
                id: 'test-id',
                userId: 'user-1',
                jobId: 'job-1',
                content: 'Test content',
                metadata: {
                    wordCount: 2,
                    generatedAt: new Date(),
                    llmProvider: 'openai',
                    jobTitle: 'Test Job',
                    company: 'Test Company'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockStoredLetter));

            const result = await service.retrieveCoverLetter('test-id');

            expect(result).toEqual(mockStoredLetter);
            expect(mockFs.readFile).toHaveBeenCalledWith(
                expect.stringContaining('test-id.json'),
                'utf-8'
            );
        });

        it('should return null when file not found', async () => {
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await service.retrieveCoverLetter('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('updateCoverLetter', () => {
        it('should update cover letter successfully', async () => {
            const mockStoredLetter = {
                id: 'test-id',
                userId: 'user-1',
                jobId: 'job-1',
                content: 'Original content',
                metadata: {
                    wordCount: 2,
                    generatedAt: new Date(),
                    llmProvider: 'openai',
                    jobTitle: 'Test Job',
                    company: 'Test Company'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Mock the file read for retrieveCoverLetter
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockStoredLetter));
            // Mock the file write for updateCoverLetter
            mockFs.writeFile.mockResolvedValueOnce(undefined);

            const success = await service.updateCoverLetter('test-id', 'Updated content here');

            expect(success).toBe(true);
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('test-id.json'),
                expect.stringContaining('Updated content here'),
                'utf-8'
            );
        });

        it('should return false when cover letter not found', async () => {
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const success = await service.updateCoverLetter('non-existent-id', 'New content');

            expect(success).toBe(false);
            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('deleteCoverLetter', () => {
        it('should delete cover letter successfully', async () => {
            const success = await service.deleteCoverLetter('test-id');

            expect(success).toBe(true);
            expect(mockFs.unlink).toHaveBeenCalledWith(
                expect.stringContaining('test-id.json')
            );
        });

        it('should handle deletion errors', async () => {
            mockFs.unlink.mockRejectedValue(new Error('Deletion failed'));

            const success = await service.deleteCoverLetter('test-id');

            expect(success).toBe(false);
        });
    });

    describe('listUserCoverLetters', () => {
        it('should list user cover letters successfully', async () => {
            const mockFiles = ['user-1-job-1-123.json', 'user-1-job-2-456.json', 'user-2-job-1-789.json'];
            const mockCoverLetter1 = {
                id: 'user-1-job-1-123',
                userId: 'user-1',
                jobId: 'job-1',
                content: 'Content 1',
                metadata: { wordCount: 2, generatedAt: new Date('2023-01-01'), llmProvider: 'openai', jobTitle: 'Job 1', company: 'Company 1' },
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-01')
            };
            const mockCoverLetter2 = {
                id: 'user-1-job-2-456',
                userId: 'user-1',
                jobId: 'job-2',
                content: 'Content 2',
                metadata: { wordCount: 3, generatedAt: new Date('2023-01-02'), llmProvider: 'openai', jobTitle: 'Job 2', company: 'Company 2' },
                createdAt: new Date('2023-01-02'),
                updatedAt: new Date('2023-01-02')
            };

            mockFs.readdir.mockResolvedValue(mockFiles as any);
            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockCoverLetter1))
                .mockResolvedValueOnce(JSON.stringify(mockCoverLetter2));

            const result = await service.listUserCoverLetters('user-1');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(mockCoverLetter2); // Newer first
            expect(result[1]).toEqual(mockCoverLetter1);
        });

        it('should return empty array when no cover letters found', async () => {
            mockFs.readdir.mockResolvedValue([]);

            const result = await service.listUserCoverLetters('user-1');

            expect(result).toEqual([]);
        });

        it('should handle file system errors', async () => {
            mockFs.readdir.mockRejectedValue(new Error('Directory read error'));

            const result = await service.listUserCoverLetters('user-1');

            expect(result).toEqual([]);
        });
    });

    describe('generateVariations', () => {
        beforeEach(() => {
            mockLlmService.isConfigured.mockReturnValue(true);
            mockLlmService.getConfig.mockReturnValue({
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                apiKey: 'test-key'
            });
            mockUserProfileRepo.findByUserId.mockResolvedValue(mockUserProfile);
            mockJobRepo.findById.mockResolvedValue(mockJob);
        });

        it('should generate multiple variations', async () => {
            mockLlmService.generateCoverLetter
                .mockResolvedValueOnce('Professional cover letter')
                .mockResolvedValueOnce('Casual cover letter')
                .mockResolvedValueOnce('Enthusiastic cover letter');

            const variations = [
                { tone: 'professional' as const },
                { tone: 'casual' as const },
                { tone: 'enthusiastic' as const }
            ];

            const results = await service.generateVariations(mockCoverLetterRequest, variations);

            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(results[2].success).toBe(true);
            expect(mockLlmService.generateCoverLetter).toHaveBeenCalledTimes(3);
        });
    });

    describe('getCoverLetterStats', () => {
        it('should return statistics for user cover letters', async () => {
            const mockFiles = ['user-1-job-1-123.json', 'user-1-job-2-456.json'];
            const recentDate = new Date();
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

            const mockCoverLetter1 = {
                id: 'user-1-job-1-123',
                userId: 'user-1',
                jobId: 'job-1',
                content: 'Content 1',
                metadata: { wordCount: 100, generatedAt: recentDate, llmProvider: 'openai', jobTitle: 'Job 1', company: 'Company 1' },
                createdAt: recentDate,
                updatedAt: recentDate
            };
            const mockCoverLetter2 = {
                id: 'user-1-job-2-456',
                userId: 'user-1',
                jobId: 'job-2',
                content: 'Content 2',
                metadata: { wordCount: 200, generatedAt: oldDate, llmProvider: 'openai', jobTitle: 'Job 2', company: 'Company 2' },
                createdAt: oldDate,
                updatedAt: oldDate
            };

            mockFs.readdir.mockResolvedValue(mockFiles as any);
            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockCoverLetter1))
                .mockResolvedValueOnce(JSON.stringify(mockCoverLetter2));

            const stats = await service.getCoverLetterStats('user-1');

            expect(stats).toEqual({
                total: 2,
                averageWordCount: 150, // (100 + 200) / 2
                recentCount: 1 // Only one in last 30 days
            });
        });

        it('should return zero stats when no cover letters exist', async () => {
            mockFs.readdir.mockResolvedValue([]);

            const stats = await service.getCoverLetterStats('user-1');

            expect(stats).toEqual({
                total: 0,
                averageWordCount: 0,
                recentCount: 0
            });
        });
    });
});