import { Router, Request, Response } from 'express';
import { JobService, JobFilters } from '../services/jobService';
import { JobRepository } from '../database/repositories/job';
import { JobMatchingService } from '../services/jobMatching';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { ApplicationRepository } from '../database/repositories/application';
import { JobQueueService } from '../services/jobQueue';
import { JobAutomationService } from '../services/jobAutomation';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';
import db from '../database/connection';
import Joi from 'joi';

const router = Router();
const jobRepository = new JobRepository();
const jobService = new JobService(jobRepository);
const userProfileRepository = new UserProfileRepository();
const applicationRepository = new ApplicationRepository();

// Initialize services - will be shared across requests
let jobQueueService: JobQueueService;
let jobAutomationService: JobAutomationService;
try {
    const pool = db.getPool();
    jobQueueService = new JobQueueService(jobRepository, pool);
    jobAutomationService = new JobAutomationService(pool);
} catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
}

const jobMatchingService = new JobMatchingService(
    jobRepository,
    userProfileRepository,
    applicationRepository
);

// Validation schemas
const jobFiltersSchema = Joi.object({
    title: Joi.string().max(255).optional(),
    company: Joi.string().max(255).optional(),
    location: Joi.string().max(255).optional(),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead').optional(),
    skills: Joi.array().items(Joi.string().max(100)).max(10).optional(),
    isAvailable: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
});

const searchQuerySchema = Joi.object({
    q: Joi.string().min(1).max(255).required(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead').optional(),
    location: Joi.string().max(255).optional(),
    isAvailable: Joi.boolean().optional()
});

const jobIdSchema = Joi.object({
    id: Joi.string().uuid().required()
});

const jobStatusSchema = Joi.object({
    isAvailable: Joi.boolean().required()
});

const crawlJobSchema = Joi.object({
    validateExisting: Joi.boolean().default(false),
    searchQueries: Joi.array().items(Joi.string().max(255)).max(10).optional(),
    companyId: Joi.string().uuid().optional()
});

const companyDiscoverySchema = Joi.object({
    searchQueries: Joi.array().items(Joi.string().min(1).max(255)).min(1).max(10).required()
});

const addCompanySchema = Joi.object({
    companyName: Joi.string().min(1).max(255).required()
});

/**
 * POST /api/jobs/discover-companies
 * Discover companies using search engines
 */
router.post('/discover-companies', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = companyDiscoverySchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: error.details.map(d => d.message)
            });
        }

        // Schedule company discovery and job scraping
        const job = await jobQueueService.scheduleCrawling({
            searchQueries: value.searchQueries,
            validateExisting: false
        });

        res.json({
            success: true,
            data: {
                jobId: job.id,
                message: 'Company discovery and job scraping scheduled successfully',
                searchQueries: value.searchQueries
            }
        });
    } catch (error) {
        logger.error('Error in POST /api/jobs/discover-companies:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to schedule company discovery'
        });
    }
});

/**
 * POST /api/jobs/add-company
 * Add a specific company and discover its jobs
 */
router.post('/add-company', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = addCompanySchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: error.details.map(d => d.message)
            });
        }

        await jobAutomationService.searchAndAddCompany(value.companyName);

        res.json({
            success: true,
            data: {
                message: `Company "${value.companyName}" added successfully`,
                companyName: value.companyName
            }
        });
    } catch (error) {
        logger.error('Error in POST /api/jobs/add-company:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to add company'
        });
    }
});

/**
 * GET /api/jobs/company-stats
 * Get company and job statistics
 */
router.get('/company-stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const stats = await jobAutomationService.getCompanyStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs/company-stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve company statistics'
        });
    }
});

/**
 * POST /api/jobs/scrape-company/:companyId
 * Scrape jobs from a specific company
 */
router.post('/scrape-company/:companyId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { companyId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                error: 'Invalid company ID',
                message: 'Company ID is required'
            });
        }

        const job = await jobQueueService.scheduleCrawling({
            companyId: companyId,
            validateExisting: false
        });

        res.json({
            success: true,
            data: {
                jobId: job.id,
                message: 'Company job scraping scheduled successfully',
                companyId: companyId
            }
        });
    } catch (error) {
        logger.error(`Error in POST /api/jobs/scrape-company/${req.params.companyId}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to schedule company scraping'
        });
    }
});

/**
 * GET /api/jobs
 * Get jobs with filtering and pagination
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = jobFiltersSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const filters: JobFilters = {
            title: value.title,
            company: value.company,
            location: value.location,
            experienceLevel: value.experienceLevel,
            skills: value.skills,
            isAvailable: value.isAvailable,
            limit: value.limit,
            offset: value.offset
        };

        const result = await jobService.getJobs(filters);

        res.json({
            success: true,
            data: {
                jobs: result.jobs,
                pagination: {
                    total: result.total,
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: result.hasMore
                }
            }
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve jobs'
        });
    }
});

/**
 * GET /api/jobs/matches
 * Get job matches for the authenticated user
 */
router.get('/matches', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = jobFiltersSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;


        const filters = {
            limit: value.limit,
            offset: value.offset,
            minScore: 0,
            excludeApplied: true
        };

        const result = await jobMatchingService.getJobMatches(userId, filters);

        res.json({
            success: true,
            data: {
                matches: result.matches,
                total: result.total,
                pagination: {
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: result.matches.length === value.limit
                }
            }
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs/matches:', error);

        if (error instanceof Error && error.message.includes('User profile not found')) {
            return res.status(404).json({
                error: 'Profile not found',
                message: 'Please create your profile first to get job matches.',
                action: 'Create profile at /api/profile'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve job matches'
        });
    }
});

/**
 * GET /api/jobs/search
 * Search jobs by text query
 */
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = searchQuerySchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid search parameters',
                details: error.details.map(d => d.message)
            });
        }

        const filters: Omit<JobFilters, 'title'> = {
            experienceLevel: value.experienceLevel,
            location: value.location,
            isAvailable: value.isAvailable,
            limit: value.limit,
            offset: value.offset
        };

        const result = await jobService.searchJobs(value.q, filters);

        res.json({
            success: true,
            data: {
                jobs: result.jobs,
                query: value.q,
                pagination: {
                    total: result.total,
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: result.hasMore
                }
            }
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs/search:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to search jobs'
        });
    }
});

/**
 * GET /api/jobs/stats
 * Get job statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const stats = await jobService.getJobStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs/stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve job statistics'
        });
    }
});

/**
 * POST /api/jobs/crawl
 * Trigger job scraping manually
 */
router.post('/crawl', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = crawlJobSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: error.details.map(d => d.message)
            });
        }

        const job = await jobQueueService.scheduleCrawling({
            validateExisting: value.validateExisting,
            searchQueries: value.searchQueries,
            companyId: value.companyId
        });

        res.json({
            success: true,
            data: {
                jobId: job.id,
                message: 'Job crawling scheduled successfully'
            }
        });
    } catch (error) {
        logger.error('Error in POST /api/jobs/crawl:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to schedule job crawling'
        });
    }
});

/**
 * GET /api/jobs/queue/stats
 * Get job queue statistics
 */
router.get('/queue/stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const stats = await jobQueueService.getQueueStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in GET /api/jobs/queue/stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve queue statistics'
        });
    }
});

/**
 * GET /api/jobs/companies/:company
 * Get jobs by company
 */
router.get('/companies/:company', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { company } = req.params;
        const { error, value } = jobFiltersSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const filters: Omit<JobFilters, 'company'> = {
            title: value.title,
            location: value.location,
            experienceLevel: value.experienceLevel,
            skills: value.skills,
            isAvailable: value.isAvailable,
            limit: value.limit,
            offset: value.offset
        };

        const result = await jobService.getJobsByCompany(company, filters);

        res.json({
            success: true,
            data: {
                jobs: result.jobs,
                company,
                pagination: {
                    total: result.total,
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: result.hasMore
                }
            }
        });
    } catch (error) {
        logger.error(`Error in GET /api/jobs/companies/${req.params.company}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve jobs by company'
        });
    }
});

/**
 * GET /api/jobs/experience/:level
 * Get jobs by experience level
 */
router.get('/experience/:level', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { level } = req.params;

        if (!['entry', 'mid', 'senior', 'lead'].includes(level)) {
            return res.status(400).json({
                error: 'Invalid experience level',
                message: 'Experience level must be one of: entry, mid, senior, lead'
            });
        }

        const { error, value } = jobFiltersSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const filters: Omit<JobFilters, 'experienceLevel'> = {
            title: value.title,
            company: value.company,
            location: value.location,
            skills: value.skills,
            isAvailable: value.isAvailable,
            limit: value.limit,
            offset: value.offset
        };

        const result = await jobService.getJobsByExperienceLevel(
            level as 'entry' | 'mid' | 'senior' | 'lead',
            filters
        );

        res.json({
            success: true,
            data: {
                jobs: result.jobs,
                experienceLevel: level,
                pagination: {
                    total: result.total,
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: result.hasMore
                }
            }
        });
    } catch (error) {
        logger.error(`Error in GET /api/jobs/experience/${req.params.level}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve jobs by experience level'
        });
    }
});

/**
 * GET /api/jobs/:id
 * Get a single job by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error } = jobIdSchema.validate(req.params);

        if (error) {
            return res.status(400).json({
                error: 'Invalid job ID',
                details: error.details.map(d => d.message)
            });
        }

        const job = await jobService.getJobById(req.params.id);

        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                message: 'The requested job does not exist'
            });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        logger.error(`Error in GET /api/jobs/${req.params.id}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve job'
        });
    }
});

/**
 * POST /api/jobs/:id/apply
 * Apply to a job
 */
router.post('/:id/apply', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error } = jobIdSchema.validate(req.params);

        if (error) {
            return res.status(400).json({
                error: 'Invalid job ID',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const jobId = req.params.id;

        // Check if job exists
        const job = await jobService.getJobById(jobId);
        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                message: 'The requested job does not exist'
            });
        }

        // Check if user already applied
        const existingApplication = await applicationRepository.findByUserIdAndJobId(userId, jobId);
        if (existingApplication) {
            return res.status(409).json({
                error: 'Already applied',
                message: 'You have already applied to this job'
            });
        }

        // Create application
        const application = await applicationRepository.create({
            userId,
            jobId,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter: req.body.coverLetter || null,
            notes: req.body.notes || null
        });

        res.status(201).json({
            success: true,
            data: application,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        logger.error(`Error in POST /api/jobs/${req.params.id}/apply:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to submit application'
        });
    }
});

/**
 * PUT /api/jobs/:id/status
 * Update job availability status
 */
router.put('/:id/status', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error: idError } = jobIdSchema.validate(req.params);

        if (idError) {
            return res.status(400).json({
                error: 'Invalid job ID',
                details: idError.details.map(d => d.message)
            });
        }

        const { error: bodyError, value } = jobStatusSchema.validate(req.body);

        if (bodyError) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: bodyError.details.map(d => d.message)
            });
        }

        const job = value.isAvailable
            ? await jobService.markJobAvailable(req.params.id)
            : await jobService.markJobUnavailable(req.params.id);

        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                message: 'The requested job does not exist'
            });
        }

        res.json({
            success: true,
            data: job,
            message: `Job marked as ${value.isAvailable ? 'available' : 'unavailable'}`
        });
    } catch (error) {
        logger.error(`Error in PUT /api/jobs/${req.params.id}/status:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update job status'
        });
    }
});

export default router;