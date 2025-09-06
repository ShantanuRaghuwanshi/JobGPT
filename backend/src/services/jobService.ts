import { JobRepository } from '../database/repositories/job';
import { Job } from '../types/database';
import { logger } from '../config/logger';

export interface JobFilters {
    title?: string;
    company?: string;
    location?: string;
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
    skills?: string[];
    isAvailable?: boolean;
    limit?: number;
    offset?: number;
}

export interface JobSearchResult {
    jobs: Job[];
    total: number;
    hasMore: boolean;
}

export class JobService {
    constructor(private jobRepository: JobRepository) { }

    /**
     * Get jobs with filtering and pagination
     */
    async getJobs(filters: JobFilters = {}): Promise<JobSearchResult> {
        try {
            const {
                title,
                company,
                location,
                experienceLevel,
                skills,
                isAvailable = true,
                limit = 20,
                offset = 0
            } = filters;

            // Build filter conditions
            const filterConditions: any = {
                isAvailable
            };

            if (title) {
                filterConditions.title = { contains: title, caseSensitive: false };
            }

            if (company) {
                filterConditions.company = { contains: company, caseSensitive: false };
            }

            if (location) {
                filterConditions.location = { contains: location, caseSensitive: false };
            }

            if (experienceLevel) {
                filterConditions.experienceLevel = experienceLevel;
            }

            if (skills && skills.length > 0) {
                filterConditions.requirements = { containsAny: skills };
            }

            const jobs = await this.jobRepository.findByFilters(filterConditions, {
                limit,
                offset,
                orderBy: { updatedAt: 'desc' }
            });

            // Get total count for pagination
            const total = await this.jobRepository.countByFilters(filterConditions);

            logger.info('Jobs retrieved', {
                count: jobs.length,
                total,
                filters: filterConditions
            });

            return {
                jobs,
                total,
                hasMore: offset + jobs.length < total
            };
        } catch (error) {
            logger.error('Error retrieving jobs:', error);
            throw new Error('Failed to retrieve jobs');
        }
    }

    /**
     * Get a single job by ID
     */
    async getJobById(jobId: string): Promise<Job | null> {
        try {
            const job = await this.jobRepository.findById(jobId);

            if (!job) {
                logger.warn(`Job not found: ${jobId}`);
                return null;
            }

            logger.info(`Job retrieved: ${job.title} at ${job.company}`);
            return job;
        } catch (error) {
            logger.error(`Error retrieving job ${jobId}:`, error);
            throw new Error('Failed to retrieve job');
        }
    }

    /**
     * Search jobs by text query with fuzzy matching
     */
    async searchJobs(query: string, filters: Omit<JobFilters, 'title'> = {}): Promise<JobSearchResult> {
        try {
            // Use fuzzy search on multiple fields
            const searchFilters: JobFilters = {
                ...filters,
                title: query
            };

            // Get jobs with fuzzy title matching (handled by repository)
            const titleResults = await this.getJobs(searchFilters);

            // Also search in company names
            const companyResults = await this.getJobs({
                ...filters,
                company: query
            });

            // Combine and deduplicate results
            const allJobs = [...titleResults.jobs];
            const seenIds = new Set(titleResults.jobs.map(job => job.id));

            // Add company results that weren't already found in title search
            for (const job of companyResults.jobs) {
                if (!seenIds.has(job.id)) {
                    allJobs.push(job);
                    seenIds.add(job.id);
                }
            }

            // Apply pagination to the combined results
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            const paginatedJobs = allJobs.slice(offset, offset + limit);

            logger.info('Job search completed with fuzzy matching', {
                query,
                totalResults: allJobs.length,
                returnedResults: paginatedJobs.length,
                titleMatches: titleResults.jobs.length,
                companyMatches: companyResults.jobs.length
            });

            return {
                jobs: paginatedJobs,
                total: allJobs.length,
                hasMore: offset + paginatedJobs.length < allJobs.length
            };
        } catch (error) {
            logger.error('Error searching jobs:', error);
            throw new Error('Failed to search jobs');
        }
    }

    /**
     * Mark a job as unavailable
     */
    async markJobUnavailable(jobId: string): Promise<Job | null> {
        try {
            const job = await this.jobRepository.findById(jobId);

            if (!job) {
                logger.warn(`Job not found for marking unavailable: ${jobId}`);
                return null;
            }

            const updatedJob = await this.jobRepository.update(jobId, {
                isAvailable: false,
                updatedAt: new Date()
            });

            logger.info(`Job marked as unavailable: ${job.title} at ${job.company}`);
            return updatedJob;
        } catch (error) {
            logger.error(`Error marking job unavailable ${jobId}:`, error);
            throw new Error('Failed to mark job as unavailable');
        }
    }

    /**
     * Mark a job as available
     */
    async markJobAvailable(jobId: string): Promise<Job | null> {
        try {
            const job = await this.jobRepository.findById(jobId);

            if (!job) {
                logger.warn(`Job not found for marking available: ${jobId}`);
                return null;
            }

            const updatedJob = await this.jobRepository.update(jobId, {
                isAvailable: true,
                updatedAt: new Date()
            });

            logger.info(`Job marked as available: ${job.title} at ${job.company}`);
            return updatedJob;
        } catch (error) {
            logger.error(`Error marking job available ${jobId}:`, error);
            throw new Error('Failed to mark job as available');
        }
    }

    /**
     * Get job statistics
     */
    async getJobStats(): Promise<{
        total: number;
        available: number;
        unavailable: number;
        byExperienceLevel: Record<string, number>;
        recentlyAdded: number;
    }> {
        try {
            const [
                total,
                available,
                unavailable,
                entryLevel,
                midLevel,
                seniorLevel,
                leadLevel,
                recentlyAdded
            ] = await Promise.all([
                this.jobRepository.countByFilters({}),
                this.jobRepository.countByFilters({ isAvailable: true }),
                this.jobRepository.countByFilters({ isAvailable: false }),
                this.jobRepository.countByFilters({ experienceLevel: 'entry' }),
                this.jobRepository.countByFilters({ experienceLevel: 'mid' }),
                this.jobRepository.countByFilters({ experienceLevel: 'senior' }),
                this.jobRepository.countByFilters({ experienceLevel: 'lead' }),
                this.jobRepository.countByFilters({
                    crawledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                })
            ]);

            const stats = {
                total,
                available,
                unavailable,
                byExperienceLevel: {
                    entry: entryLevel,
                    mid: midLevel,
                    senior: seniorLevel,
                    lead: leadLevel
                },
                recentlyAdded
            };

            logger.info('Job statistics retrieved', stats);
            return stats;
        } catch (error) {
            logger.error('Error retrieving job statistics:', error);
            throw new Error('Failed to retrieve job statistics');
        }
    }

    /**
     * Get jobs by company
     */
    async getJobsByCompany(company: string, filters: Omit<JobFilters, 'company'> = {}): Promise<JobSearchResult> {
        return this.getJobs({
            ...filters,
            company
        });
    }

    /**
     * Get jobs by experience level
     */
    async getJobsByExperienceLevel(
        experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
        filters: Omit<JobFilters, 'experienceLevel'> = {}
    ): Promise<JobSearchResult> {
        return this.getJobs({
            ...filters,
            experienceLevel
        });
    }

    /**
     * Get jobs by location
     */
    async getJobsByLocation(location: string, filters: Omit<JobFilters, 'location'> = {}): Promise<JobSearchResult> {
        return this.getJobs({
            ...filters,
            location
        });
    }
}