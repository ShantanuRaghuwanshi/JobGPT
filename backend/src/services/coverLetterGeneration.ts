import { Job, UserProfile } from '../types/database';
import { ParsedResume } from '../types';
import { llmService } from './llm/llmService';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { JobRepository } from '../database/repositories/job';
import { logger } from '../config/logger';
import { promises as fs } from 'fs';
import path from 'path';

export interface CoverLetterRequest {
    userId: string;
    jobId: string;
    customInstructions?: string;
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'formal';
    length?: 'short' | 'medium' | 'long';
}

export interface CoverLetterResult {
    success: boolean;
    coverLetter?: string;
    error?: string;
    metadata?: {
        wordCount: number;
        generatedAt: Date;
        llmProvider: string;
        jobTitle: string;
        company: string;
    };
}

export interface StoredCoverLetter {
    id: string;
    userId: string;
    jobId: string;
    content: string;
    metadata: {
        wordCount: number;
        generatedAt: Date;
        llmProvider: string;
        jobTitle: string;
        company: string;
        tone?: string;
        length?: string;
        customInstructions?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export class CoverLetterGenerationService {
    private userProfileRepo: UserProfileRepository;
    private jobRepo: JobRepository;
    private storageDir: string;

    constructor(storageDir: string = './storage/cover-letters') {
        this.userProfileRepo = new UserProfileRepository();
        this.jobRepo = new JobRepository();
        this.storageDir = storageDir;
        this.ensureStorageDirectory();
    }

    private async ensureStorageDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create cover letter storage directory:', error);
        }
    }

    /**
     * Generate a cover letter for a specific job application
     */
    public async generateCoverLetter(request: CoverLetterRequest): Promise<CoverLetterResult> {
        try {
            // Validate LLM configuration
            if (!llmService.isConfigured()) {
                return {
                    success: false,
                    error: 'LLM service is not configured. Please set up your AI model configuration.'
                };
            }

            // Get user profile and job details
            const userProfile = await this.userProfileRepo.findByUserId(request.userId);
            if (!userProfile) {
                return {
                    success: false,
                    error: 'User profile not found'
                };
            }

            const job = await this.jobRepo.findById(request.jobId);
            if (!job) {
                return {
                    success: false,
                    error: 'Job not found'
                };
            }

            // Convert user profile to ParsedResume format for LLM
            const resumeData = this.convertProfileToResume(userProfile);

            // Enhance job description with custom instructions and preferences
            const enhancedJobDescription = this.enhanceJobDescription(job, request);

            // Generate cover letter using LLM service
            const coverLetter = await llmService.generateCoverLetter(resumeData, enhancedJobDescription);

            // Post-process the cover letter
            const processedCoverLetter = this.postProcessCoverLetter(coverLetter, request);

            // Calculate metadata
            const wordCount = this.countWords(processedCoverLetter);
            const llmConfig = llmService.getConfig();

            const result: CoverLetterResult = {
                success: true,
                coverLetter: processedCoverLetter,
                metadata: {
                    wordCount,
                    generatedAt: new Date(),
                    llmProvider: llmConfig?.provider || 'unknown',
                    jobTitle: job.title,
                    company: job.company
                }
            };

            logger.info(`Cover letter generated successfully for user ${request.userId} and job ${request.jobId}`);
            return result;

        } catch (error) {
            logger.error('Error generating cover letter:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Convert UserProfile to ParsedResume format
     */
    private convertProfileToResume(profile: UserProfile): ParsedResume {
        return {
            personalInfo: {
                name: profile.name,
                email: 'user@example.com', // TODO: Get actual email from user table
                location: profile.location
            },
            experience: [], // TODO: This would need to be expanded with actual experience data
            education: [], // TODO: This would need to be expanded with actual education data
            skills: profile.skills
        };
    }

    /**
     * Enhance job description with custom instructions and preferences
     */
    private enhanceJobDescription(job: Job, request: CoverLetterRequest): string {
        let enhanced = `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\n`;
        enhanced += `Job Description:\n${job.description}\n\n`;

        if (job.requirements.length > 0) {
            enhanced += `Requirements:\n${job.requirements.map(req => `- ${req}`).join('\n')}\n\n`;
        }

        // Add tone instructions
        if (request.tone) {
            enhanced += `Tone: Please write the cover letter in a ${request.tone} tone.\n`;
        }

        // Add length instructions
        if (request.length) {
            const lengthInstructions = {
                short: 'Keep the cover letter concise, around 150-200 words.',
                medium: 'Write a standard cover letter, around 250-350 words.',
                long: 'Write a detailed cover letter, around 400-500 words.'
            };
            enhanced += `Length: ${lengthInstructions[request.length]}\n`;
        }

        // Add custom instructions
        if (request.customInstructions) {
            enhanced += `Additional Instructions: ${request.customInstructions}\n`;
        }

        return enhanced;
    }

    /**
     * Post-process the generated cover letter
     */
    private postProcessCoverLetter(coverLetter: string, request: CoverLetterRequest): string {
        let processed = coverLetter.trim();

        // Remove any unwanted prefixes or suffixes that LLMs sometimes add
        const unwantedPrefixes = [
            'Here is a cover letter:',
            'Here\'s a cover letter:',
            'Cover Letter:'
        ];

        for (const prefix of unwantedPrefixes) {
            if (processed.toLowerCase().startsWith(prefix.toLowerCase())) {
                processed = processed.substring(prefix.length).trim();
            }
        }

        // Ensure proper formatting
        processed = processed.replace(/\n{3,}/g, '\n\n'); // Remove excessive line breaks

        return processed;
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Store cover letter to file system
     */
    public async storeCoverLetter(userId: string, jobId: string, coverLetterResult: CoverLetterResult): Promise<string | null> {
        if (!coverLetterResult.success || !coverLetterResult.coverLetter) {
            return null;
        }

        try {
            const coverLetterId = `${userId}-${jobId}-${Date.now()}`;
            const fileName = `${coverLetterId}.json`;
            const filePath = path.join(this.storageDir, fileName);

            const storedCoverLetter: StoredCoverLetter = {
                id: coverLetterId,
                userId,
                jobId,
                content: coverLetterResult.coverLetter,
                metadata: {
                    ...coverLetterResult.metadata!,
                    tone: undefined, // These would come from the request
                    length: undefined,
                    customInstructions: undefined
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await fs.writeFile(filePath, JSON.stringify(storedCoverLetter, null, 2), 'utf-8');
            logger.info(`Cover letter stored with ID: ${coverLetterId}`);
            return coverLetterId;

        } catch (error) {
            logger.error('Error storing cover letter:', error);
            return null;
        }
    }

    /**
     * Retrieve stored cover letter
     */
    public async retrieveCoverLetter(coverLetterId: string): Promise<StoredCoverLetter | null> {
        try {
            const fileName = `${coverLetterId}.json`;
            const filePath = path.join(this.storageDir, fileName);

            const fileContent = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(fileContent);

            // Convert date strings back to Date objects
            return {
                ...parsed,
                createdAt: new Date(parsed.createdAt),
                updatedAt: new Date(parsed.updatedAt),
                metadata: {
                    ...parsed.metadata,
                    generatedAt: new Date(parsed.metadata.generatedAt)
                }
            } as StoredCoverLetter;

        } catch (error) {
            logger.error('Error retrieving cover letter:', error);
            return null;
        }
    }

    /**
     * Update stored cover letter content
     */
    public async updateCoverLetter(coverLetterId: string, newContent: string): Promise<boolean> {
        try {
            const storedCoverLetter = await this.retrieveCoverLetter(coverLetterId);
            if (!storedCoverLetter) {
                return false;
            }

            storedCoverLetter.content = newContent;
            storedCoverLetter.updatedAt = new Date();
            storedCoverLetter.metadata.wordCount = this.countWords(newContent);

            const fileName = `${coverLetterId}.json`;
            const filePath = path.join(this.storageDir, fileName);

            await fs.writeFile(filePath, JSON.stringify(storedCoverLetter, null, 2), 'utf-8');
            logger.info(`Cover letter updated: ${coverLetterId}`);
            return true;

        } catch (error) {
            logger.error('Error updating cover letter:', error);
            return false;
        }
    }

    /**
     * Delete stored cover letter
     */
    public async deleteCoverLetter(coverLetterId: string): Promise<boolean> {
        try {
            const fileName = `${coverLetterId}.json`;
            const filePath = path.join(this.storageDir, fileName);

            await fs.unlink(filePath);
            logger.info(`Cover letter deleted: ${coverLetterId}`);
            return true;

        } catch (error) {
            logger.error('Error deleting cover letter:', error);
            return false;
        }
    }

    /**
     * List all cover letters for a user
     */
    public async listUserCoverLetters(userId: string): Promise<StoredCoverLetter[]> {
        try {
            const files = await fs.readdir(this.storageDir);
            const userCoverLetters: StoredCoverLetter[] = [];

            for (const file of files) {
                if (file.endsWith('.json') && file.startsWith(userId)) {
                    try {
                        const filePath = path.join(this.storageDir, file);
                        const fileContent = await fs.readFile(filePath, 'utf-8');
                        const parsed = JSON.parse(fileContent);

                        // Convert date strings back to Date objects
                        const coverLetter: StoredCoverLetter = {
                            ...parsed,
                            createdAt: new Date(parsed.createdAt),
                            updatedAt: new Date(parsed.updatedAt),
                            metadata: {
                                ...parsed.metadata,
                                generatedAt: new Date(parsed.metadata.generatedAt)
                            }
                        };

                        userCoverLetters.push(coverLetter);
                    } catch (error) {
                        logger.warn(`Error reading cover letter file ${file}:`, error);
                    }
                }
            }

            // Sort by creation date, newest first
            return userCoverLetters.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

        } catch (error) {
            logger.error('Error listing user cover letters:', error);
            return [];
        }
    }

    /**
     * Generate multiple cover letter variations
     */
    public async generateVariations(
        baseRequest: CoverLetterRequest,
        variations: Partial<CoverLetterRequest>[]
    ): Promise<CoverLetterResult[]> {
        const results: CoverLetterResult[] = [];

        for (const variation of variations) {
            const request = { ...baseRequest, ...variation };
            const result = await this.generateCoverLetter(request);
            results.push(result);

            // Add small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Get cover letter statistics for a user
     */
    public async getCoverLetterStats(userId: string): Promise<{
        total: number;
        averageWordCount: number;
        mostUsedTone?: string;
        mostUsedLength?: string;
        recentCount: number; // Last 30 days
    }> {
        try {
            const coverLetters = await this.listUserCoverLetters(userId);

            if (coverLetters.length === 0) {
                return {
                    total: 0,
                    averageWordCount: 0,
                    recentCount: 0
                };
            }

            const totalWordCount = coverLetters.reduce((sum, cl) => sum + cl.metadata.wordCount, 0);
            const averageWordCount = Math.round(totalWordCount / coverLetters.length);

            // Count recent cover letters (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentCount = coverLetters.filter(cl =>
                new Date(cl.createdAt) > thirtyDaysAgo
            ).length;

            return {
                total: coverLetters.length,
                averageWordCount,
                recentCount
            };

        } catch (error) {
            logger.error('Error getting cover letter stats:', error);
            return {
                total: 0,
                averageWordCount: 0,
                recentCount: 0
            };
        }
    }
}