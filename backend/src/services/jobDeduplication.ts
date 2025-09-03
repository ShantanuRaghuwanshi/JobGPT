import { Job } from '../types/database';
import { ScrapedJobData } from './jobScraper';
import { logger } from '../config/logger';

export interface JobValidationResult {
    isValid: boolean;
    errors: string[];
}

export class JobDeduplicationService {
    /**
     * Remove duplicate jobs from scraped data based on title, company, and location
     */
    deduplicateScrapedJobs(scrapedJobs: ScrapedJobData[]): ScrapedJobData[] {
        const seen = new Set<string>();
        const deduplicated: ScrapedJobData[] = [];

        for (const job of scrapedJobs) {
            const key = this.generateJobKey(job.title, job.company, job.location);

            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(job);
            } else {
                logger.debug(`Duplicate job found: ${job.title} at ${job.company}`);
            }
        }

        logger.info(`Deduplicated ${scrapedJobs.length} jobs to ${deduplicated.length} unique jobs`);
        return deduplicated;
    }

    /**
     * Check if a scraped job already exists in the database
     */
    findExistingJob(scrapedJob: ScrapedJobData, existingJobs: Job[]): Job | null {
        const scrapedKey = this.generateJobKey(scrapedJob.title, scrapedJob.company, scrapedJob.location);

        return existingJobs.find(existingJob => {
            const existingKey = this.generateJobKey(existingJob.title, existingJob.company, existingJob.location);
            return existingKey === scrapedKey;
        }) || null;
    }

    /**
     * Validate scraped job data
     */
    validateJobData(job: ScrapedJobData): JobValidationResult {
        const errors: string[] = [];

        // Required fields validation
        if (!job.title || job.title.trim().length === 0) {
            errors.push('Job title is required');
        }

        if (!job.company || job.company.trim().length === 0) {
            errors.push('Company name is required');
        }

        if (!job.location || job.location.trim().length === 0) {
            errors.push('Job location is required');
        }

        if (!job.description || job.description.trim().length === 0) {
            errors.push('Job description is required');
        }

        if (!job.applicationUrl || !this.isValidUrl(job.applicationUrl)) {
            errors.push('Valid application URL is required');
        }

        // Length validations
        if (job.title && job.title.length > 255) {
            errors.push('Job title must be less than 255 characters');
        }

        if (job.company && job.company.length > 255) {
            errors.push('Company name must be less than 255 characters');
        }

        if (job.location && job.location.length > 255) {
            errors.push('Job location must be less than 255 characters');
        }

        if (job.description && job.description.length > 10000) {
            errors.push('Job description must be less than 10000 characters');
        }

        // Experience level validation
        const validExperienceLevels = ['entry', 'mid', 'senior', 'lead'];
        if (!validExperienceLevels.includes(job.experienceLevel)) {
            errors.push('Invalid experience level');
        }

        // Requirements validation
        if (job.requirements && job.requirements.length > 20) {
            errors.push('Too many requirements (maximum 20)');
        }

        if (job.requirements) {
            for (const requirement of job.requirements) {
                if (requirement.length > 500) {
                    errors.push('Individual requirement must be less than 500 characters');
                    break;
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate a unique key for job deduplication
     */
    private generateJobKey(title: string, company: string, location: string): string {
        // Normalize strings for comparison
        const normalizedTitle = this.normalizeString(title);
        const normalizedCompany = this.normalizeString(company);
        const normalizedLocation = this.normalizeString(location);

        return `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
    }

    /**
     * Normalize string for consistent comparison
     */
    private normalizeString(str: string): string {
        return str
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[^\w\s]/g, '') // Remove special characters
            .trim();
    }

    /**
     * Validate URL format
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Calculate similarity score between two job descriptions
     * Used for more sophisticated duplicate detection
     */
    calculateSimilarity(job1: ScrapedJobData, job2: ScrapedJobData): number {
        // Simple similarity based on common words in descriptions
        const words1 = this.extractWords(job1.description);
        const words2 = this.extractWords(job2.description);

        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];

        return intersection.length / union.length;
    }

    /**
     * Extract meaningful words from text for similarity comparison
     */
    private extractWords(text: string): string[] {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 100); // Limit to first 100 meaningful words
    }
}