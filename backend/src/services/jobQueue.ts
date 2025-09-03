import Bull, { Queue, Job as BullJob } from 'bull';
import { JobAutomationService } from './jobAutomation';
import { JobDeduplicationService } from './jobDeduplication';
import { JobRepository } from '../database/repositories/job';
import { logger } from '../config/logger';
import { Pool } from 'pg';

export interface CrawlJobData {
    searchQueries?: string[];
    validateExisting?: boolean;
    companyId?: string;
}

export interface ValidateJobData {
    jobIds: string[];
}

export class JobQueueService {
    private crawlQueue: Queue<CrawlJobData>;
    private validateQueue: Queue<ValidateJobData>;
    private automationService: JobAutomationService;
    private deduplicationService: JobDeduplicationService;
    private jobRepository: JobRepository;

    constructor(jobRepository: JobRepository, db: Pool) {
        this.jobRepository = jobRepository;
        this.automationService = new JobAutomationService(db);
        this.deduplicationService = new JobDeduplicationService();

        // Initialize queues with Redis connection
        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        };

        this.crawlQueue = new Bull('job-crawling', { redis: redisConfig });
        this.validateQueue = new Bull('job-validation', { redis: redisConfig });

        this.setupQueueProcessors();
        this.setupQueueEvents();
    }

    private setupQueueProcessors(): void {
        // Process job crawling
        this.crawlQueue.process('crawl-jobs', 1, async (job: BullJob<CrawlJobData>) => {
            logger.info('Starting job crawling process', { jobId: job.id });

            try {
                if (job.data.companyId) {
                    // Scrape specific company
                    const scrapedJobs = await this.automationService.scrapeSpecificCompany(job.data.companyId);
                    logger.info(`Scraped ${scrapedJobs.length} jobs from specific company`);

                    return {
                        scraped: scrapedJobs.length,
                        newJobs: scrapedJobs.length,
                        updatedJobs: 0
                    };
                } else {
                    // Run full discovery pipeline
                    const searchQueries = job.data.searchQueries || [
                        'software engineer jobs',
                        'data scientist careers',
                        'product manager hiring',
                        'frontend developer jobs',
                        'backend engineer careers',
                        'devops engineer jobs'
                    ];

                    await this.automationService.runFullJobDiscoveryPipeline(searchQueries);

                    // Get stats
                    const stats = await this.automationService.getCompanyStats();

                    logger.info('Job discovery pipeline completed', stats);

                    return {
                        scraped: stats.jobs.total_jobs,
                        newJobs: stats.jobs.available_jobs,
                        updatedJobs: 0,
                        companies: stats.companies.total_companies
                    };
                }
            } catch (error) {
                logger.error('Error in job crawling process:', error);
                throw error;
            }
        });

        // Process job validation
        this.validateQueue.process('validate-jobs', 2, async (job: BullJob<ValidateJobData>) => {
            logger.info('Starting job validation process', { jobId: job.id, jobCount: job.data.jobIds.length });

            let validatedCount = 0;
            let unavailableCount = 0;

            try {
                // Note: Job validation would need to be implemented in the automation service
                // For now, we'll skip this as the focus is on the discovery pipeline
                logger.info('Job validation skipped - focusing on discovery pipeline');

                return {
                    validated: validatedCount,
                    markedUnavailable: unavailableCount
                };
            } catch (error) {
                logger.error('Error in job validation process:', error);
                throw error;
            }
        });
    }

    private setupQueueEvents(): void {
        // Crawl queue events
        this.crawlQueue.on('completed', (job, result) => {
            logger.info('Job crawling completed', { jobId: job.id, result });
        });

        this.crawlQueue.on('failed', (job, err) => {
            logger.error('Job crawling failed', { jobId: job.id, error: err.message });
        });

        // Validate queue events
        this.validateQueue.on('completed', (job, result) => {
            logger.info('Job validation completed', { jobId: job.id, result });
        });

        this.validateQueue.on('failed', (job, err) => {
            logger.error('Job validation failed', { jobId: job.id, error: err.message });
        });
    }

    /**
     * Schedule job crawling
     */
    async scheduleCrawling(options: CrawlJobData = {}): Promise<BullJob<CrawlJobData>> {
        return this.crawlQueue.add('crawl-jobs', {
            searchQueries: options.searchQueries,
            validateExisting: options.validateExisting || false,
            companyId: options.companyId
        });
    }

    /**
     * Schedule job validation
     */
    async scheduleValidation(jobIds: string[]): Promise<BullJob<ValidateJobData>> {
        return this.validateQueue.add('validate-jobs', { jobIds });
    }

    /**
     * Set up recurring job crawling
     */
    setupRecurringCrawling(): void {
        // Crawl jobs every 6 hours
        this.crawlQueue.add('crawl-jobs',
            { validateExisting: true },
            {
                repeat: { cron: '0 */6 * * *' }, // Every 6 hours
                removeOnComplete: 10,
                removeOnFail: 5
            }
        );

        logger.info('Recurring job crawling scheduled (every 6 hours)');
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        const [crawlWaiting, crawlActive, crawlCompleted, crawlFailed] = await Promise.all([
            this.crawlQueue.getWaiting(),
            this.crawlQueue.getActive(),
            this.crawlQueue.getCompleted(),
            this.crawlQueue.getFailed()
        ]);

        const [validateWaiting, validateActive, validateCompleted, validateFailed] = await Promise.all([
            this.validateQueue.getWaiting(),
            this.validateQueue.getActive(),
            this.validateQueue.getCompleted(),
            this.validateQueue.getFailed()
        ]);

        return {
            crawling: {
                waiting: crawlWaiting.length,
                active: crawlActive.length,
                completed: crawlCompleted.length,
                failed: crawlFailed.length
            },
            validation: {
                waiting: validateWaiting.length,
                active: validateActive.length,
                completed: validateCompleted.length,
                failed: validateFailed.length
            }
        };
    }

    /**
     * Clean up queues and close connections
     */
    async cleanup(): Promise<void> {
        await Promise.all([
            this.crawlQueue.close(),
            this.validateQueue.close()
        ]);

        logger.info('Job queue service cleaned up');
    }
}