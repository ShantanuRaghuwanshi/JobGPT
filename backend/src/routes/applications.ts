import { Router, Request, Response } from 'express';
import { ApplicationStatusService, StatusUpdateRequest } from '../services/applicationStatus';
import { ApplicationRepository } from '../database/repositories/application';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';
import Joi from 'joi';

const router = Router();
const applicationRepository = new ApplicationRepository();
const applicationStatusService = new ApplicationStatusService(applicationRepository);

// Validation schemas
const applicationIdSchema = Joi.object({
    id: Joi.string().uuid().required()
});

const statusUpdateSchema = Joi.object({
    status: Joi.string().valid('applied', 'interview', 'offered', 'rejected').required(),
    notes: Joi.string().max(1000).optional(),
    interviewDate: Joi.date().iso().optional()
});

const notesSchema = Joi.object({
    notes: Joi.string().max(1000).required()
});

const interviewDateSchema = Joi.object({
    interviewDate: Joi.date().iso().required()
});

const statusFilterSchema = Joi.object({
    status: Joi.string().valid('applied', 'interview', 'offered', 'rejected').optional()
});

/**
 * GET /api/applications
 * Get user's applications, optionally filtered by status
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error, value } = statusFilterSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const applications = await applicationStatusService.getApplicationsByStatus(userId, value.status);

        res.json({
            success: true,
            data: {
                applications,
                count: applications.length,
                status: value.status || 'all'
            }
        });
    } catch (error) {
        logger.error('Error in GET /api/applications:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve applications'
        });
    }
});

/**
 * GET /api/applications/stats
 * Get application statistics for the user
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const stats = await applicationStatusService.getApplicationStatistics(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in GET /api/applications/stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve application statistics'
        });
    }
});

/**
 * GET /api/applications/:id
 * Get a specific application by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error } = applicationIdSchema.validate(req.params);

        if (error) {
            return res.status(400).json({
                error: 'Invalid application ID',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const application = await applicationRepository.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                error: 'Application not found',
                message: 'The requested application does not exist'
            });
        }

        // Verify ownership
        if (application.userId !== userId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have access to this application'
            });
        }

        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        logger.error(`Error in GET /api/applications/${req.params.id}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve application'
        });
    }
});

/**
 * PUT /api/applications/:id/status
 * Update application status
 */
router.put('/:id/status', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error: idError } = applicationIdSchema.validate(req.params);

        if (idError) {
            return res.status(400).json({
                error: 'Invalid application ID',
                details: idError.details.map(d => d.message)
            });
        }

        const { error: bodyError, value } = statusUpdateSchema.validate(req.body);

        if (bodyError) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: bodyError.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const statusUpdateRequest: StatusUpdateRequest = {
            status: value.status,
            notes: value.notes,
            interviewDate: value.interviewDate ? new Date(value.interviewDate) : undefined
        };

        const updatedApplication = await applicationStatusService.updateApplicationStatus(
            req.params.id,
            userId,
            statusUpdateRequest
        );

        res.json({
            success: true,
            data: updatedApplication,
            message: `Application status updated to ${value.status}`
        });
    } catch (error) {
        logger.error(`Error in PUT /api/applications/${req.params.id}/status:`, error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    error: 'Application not found',
                    message: error.message
                });
            }

            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: error.message
                });
            }

            if (error.message.includes('Invalid status transition')) {
                return res.status(400).json({
                    error: 'Invalid status transition',
                    message: error.message
                });
            }
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update application status'
        });
    }
});

/**
 * GET /api/applications/:id/history
 * Get application status history
 */
router.get('/:id/history', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error } = applicationIdSchema.validate(req.params);

        if (error) {
            return res.status(400).json({
                error: 'Invalid application ID',
                details: error.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const statusHistory = await applicationStatusService.getApplicationStatusHistory(
            req.params.id,
            userId
        );

        res.json({
            success: true,
            data: {
                applicationId: req.params.id,
                history: statusHistory
            }
        });
    } catch (error) {
        logger.error(`Error in GET /api/applications/${req.params.id}/history:`, error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    error: 'Application not found',
                    message: error.message
                });
            }

            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: error.message
                });
            }
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve application history'
        });
    }
});

/**
 * PUT /api/applications/:id/notes
 * Add or update notes for an application
 */
router.put('/:id/notes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error: idError } = applicationIdSchema.validate(req.params);

        if (idError) {
            return res.status(400).json({
                error: 'Invalid application ID',
                details: idError.details.map(d => d.message)
            });
        }

        const { error: bodyError, value } = notesSchema.validate(req.body);

        if (bodyError) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: bodyError.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const updatedApplication = await applicationStatusService.addApplicationNotes(
            req.params.id,
            userId,
            value.notes
        );

        res.json({
            success: true,
            data: updatedApplication,
            message: 'Application notes updated'
        });
    } catch (error) {
        logger.error(`Error in PUT /api/applications/${req.params.id}/notes:`, error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    error: 'Application not found',
                    message: error.message
                });
            }

            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: error.message
                });
            }
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update application notes'
        });
    }
});

/**
 * PUT /api/applications/:id/interview-date
 * Update interview date for an application
 */
router.put('/:id/interview-date', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { error: idError } = applicationIdSchema.validate(req.params);

        if (idError) {
            return res.status(400).json({
                error: 'Invalid application ID',
                details: idError.details.map(d => d.message)
            });
        }

        const { error: bodyError, value } = interviewDateSchema.validate(req.body);

        if (bodyError) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: bodyError.details.map(d => d.message)
            });
        }

        const userId = (req as any).user.userId;
        const updatedApplication = await applicationStatusService.updateInterviewDate(
            req.params.id,
            userId,
            new Date(value.interviewDate)
        );

        res.json({
            success: true,
            data: updatedApplication,
            message: 'Interview date updated'
        });
    } catch (error) {
        logger.error(`Error in PUT /api/applications/${req.params.id}/interview-date:`, error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    error: 'Application not found',
                    message: error.message
                });
            }

            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: error.message
                });
            }

            if (error.message.includes('interview status')) {
                return res.status(400).json({
                    error: 'Invalid operation',
                    message: error.message
                });
            }
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update interview date'
        });
    }
});

/**
 * GET /api/applications/status/:status/valid-transitions
 * Get valid status transitions for a given status
 */
router.get('/status/:status/valid-transitions', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const { status } = req.params;

        if (!['applied', 'interview', 'offered', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be one of: applied, interview, offered, rejected'
            });
        }

        const validNextStatuses = applicationStatusService.getValidNextStatuses(
            status as 'applied' | 'interview' | 'offered' | 'rejected'
        );

        res.json({
            success: true,
            data: {
                currentStatus: status,
                validTransitions: validNextStatuses
            }
        });
    } catch (error) {
        logger.error(`Error in GET /api/applications/status/${req.params.status}/valid-transitions:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve valid status transitions'
        });
    }
});

export default router;