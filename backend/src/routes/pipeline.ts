import { Router, Request, Response } from 'express';
import { PipelineService, DragDropRequest } from '../services/pipelineService';
import { ApplicationStatusService } from '../services/applicationStatus';
import { ApplicationRepository } from '../database/repositories/application';
import { JobRepository } from '../database/repositories/job';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';
import Joi from 'joi';

const router = Router();

// Initialize repositories and services
const applicationRepository = new ApplicationRepository();
const jobRepository = new JobRepository();
const applicationStatusService = new ApplicationStatusService(applicationRepository);
const pipelineService = new PipelineService(applicationRepository, jobRepository, applicationStatusService);

// Validation schemas
const pipelineQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(200).default(50)
});

const dragDropSchema = Joi.object({
    jobId: Joi.string().uuid().required(),
    fromColumn: Joi.string().valid('available', 'applied', 'interview', 'offered').required(),
    toColumn: Joi.string().valid('available', 'applied', 'interview', 'offered').required(),
    position: Joi.number().integer().min(0).optional()
});

const validDropTargetsSchema = Joi.object({
    jobId: Joi.string().uuid().required(),
    currentColumn: Joi.string().valid('available', 'applied', 'interview', 'offered').required()
});

/**
 * GET /api/pipeline
 * Get pipeline data with jobs organized by status columns
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = pipelineQuerySchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const pipelineData = await pipelineService.getPipelineData(userId, value.limit);

        res.json({
            success: true,
            data: pipelineData
        });
    } catch (error) {
        logger.error('Error in GET /api/pipeline:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve pipeline data'
        });
    }
});

/**
 * GET /api/pipeline/stats
 * Get pipeline statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const stats = await pipelineService.getPipelineStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in GET /api/pipeline/stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve pipeline statistics'
        });
    }
});

/**
 * POST /api/pipeline/drag-drop
 * Handle drag and drop operations
 */
router.post('/drag-drop', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = dragDropSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const dragDropRequest: DragDropRequest = {
            jobId: value.jobId,
            fromColumn: value.fromColumn,
            toColumn: value.toColumn,
            position: value.position
        };

        const result = await pipelineService.handleDragDrop(userId, dragDropRequest);

        res.json({
            success: result.success,
            data: result.updatedApplication,
            message: result.message
        });
    } catch (error) {
        logger.error('Error in POST /api/pipeline/drag-drop:', error);

        if (error instanceof Error) {
            if (error.message.includes('Invalid column')) {
                return res.status(400).json({
                    error: 'Invalid column',
                    message: error.message
                });
            }

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: error.message
                });
            }

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    error: 'Not found',
                    message: error.message
                });
            }

            if (error.message.includes('Can only apply') || error.message.includes('Invalid status transition')) {
                return res.status(400).json({
                    error: 'Invalid operation',
                    message: error.message
                });
            }
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process drag and drop operation'
        });
    }
});

/**
 * GET /api/pipeline/valid-drop-targets
 * Get valid drop targets for a job in a specific column
 */
router.get('/valid-drop-targets', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = validDropTargetsSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const validTargets = await pipelineService.getValidDropTargets(
            userId,
            value.jobId,
            value.currentColumn
        );

        res.json({
            success: true,
            data: {
                jobId: value.jobId,
                currentColumn: value.currentColumn,
                validDropTargets: validTargets
            }
        });
    } catch (error) {
        logger.error('Error in GET /api/pipeline/valid-drop-targets:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve valid drop targets'
        });
    }
});

/**
 * POST /api/pipeline/refresh
 * Refresh pipeline data (useful after external changes)
 */
router.post('/refresh', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const pipelineData = await pipelineService.getPipelineData(userId);

        res.json({
            success: true,
            data: pipelineData,
            message: 'Pipeline data refreshed'
        });
    } catch (error) {
        logger.error('Error in POST /api/pipeline/refresh:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to refresh pipeline data'
        });
    }
});

export default router;