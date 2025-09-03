import express from 'express';
import { DashboardService } from '../services/dashboardService';
import { JobService } from '../services/jobService';
import { ApplicationStatusService } from '../services/applicationStatus';
import { JobMatchingService } from '../services/jobMatching';
import { UserProfileRepository } from '../database/repositories/userProfile';
import { ApplicationRepository } from '../database/repositories/application';
import { JobRepository } from '../database/repositories/job';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

// Initialize repositories and services
const userProfileRepository = new UserProfileRepository();
const applicationRepository = new ApplicationRepository();
const jobRepository = new JobRepository();

const jobService = new JobService(jobRepository);
const applicationStatusService = new ApplicationStatusService(applicationRepository);
const jobMatchingService = new JobMatchingService(jobRepository, userProfileRepository, applicationRepository);

const dashboardService = new DashboardService(
    jobService,
    applicationStatusService,
    jobMatchingService,
    userProfileRepository,
    applicationRepository,
    jobRepository
);

/**
 * GET /api/dashboard
 * Get comprehensive dashboard data for the authenticated user
 */
router.get('/', authenticateToken, async (req, res): Promise<any> => {
    try {
        const userId = (req as any).user.userId;

        logger.info(`Dashboard data requested for user ${userId}`);

        const dashboardData = await dashboardService.getDashboardData(userId);

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        logger.error('Error getting dashboard data:', error);

        if (error instanceof Error) {
            if (error.message === 'User profile not found') {
                return res.status(404).json({
                    error: {
                        code: 'PROFILE_NOT_FOUND',
                        message: 'User profile not found. Please complete your profile first.',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }

        res.status(500).json({
            error: {
                code: 'DASHBOARD_ERROR',
                message: 'Failed to load dashboard data',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics only
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        logger.info(`Dashboard stats requested for user ${userId}`);

        const stats = await dashboardService.getDashboardStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting dashboard stats:', error);

        res.status(500).json({
            error: {
                code: 'STATS_ERROR',
                message: 'Failed to load dashboard statistics',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity for the user
 */
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const limit = parseInt(req.query.limit as string) || 10;

        logger.info(`Recent activity requested for user ${userId}`);

        const activity = await dashboardService.getRecentActivity(userId, limit);

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        logger.error('Error getting recent activity:', error);

        res.status(500).json({
            error: {
                code: 'ACTIVITY_ERROR',
                message: 'Failed to load recent activity',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/dashboard/interviews
 * Get upcoming interviews
 */
router.get('/interviews', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        logger.info(`Upcoming interviews requested for user ${userId}`);

        const interviews = await dashboardService.getUpcomingInterviews(userId);

        res.json({
            success: true,
            data: interviews
        });
    } catch (error) {
        logger.error('Error getting upcoming interviews:', error);

        res.status(500).json({
            error: {
                code: 'INTERVIEWS_ERROR',
                message: 'Failed to load upcoming interviews',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * POST /api/dashboard/refresh-recommendations
 * Refresh job recommendations for the user
 */
router.post('/refresh-recommendations', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        logger.info(`Job recommendations refresh requested for user ${userId}`);

        await dashboardService.refreshJobRecommendations(userId);

        res.json({
            success: true,
            message: 'Job recommendations refreshed successfully'
        });
    } catch (error) {
        logger.error('Error refreshing job recommendations:', error);

        res.status(500).json({
            error: {
                code: 'REFRESH_ERROR',
                message: 'Failed to refresh job recommendations',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/dashboard/metrics
 * Get user metrics and analytics
 */
router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        logger.info(`User metrics requested for user ${userId}`);

        const metrics = await dashboardService.getUserMetrics(userId);

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        logger.error('Error getting user metrics:', error);

        res.status(500).json({
            error: {
                code: 'METRICS_ERROR',
                message: 'Failed to load user metrics',
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * GET /api/dashboard/recommendations
 * Get job recommendations
 */
router.get('/recommendations', authenticateToken, async (req, res): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const limit = parseInt(req.query.limit as string) || 10;

        logger.info(`Job recommendations requested for user ${userId}`);

        const recommendations = await jobMatchingService.getJobRecommendations(userId, limit);

        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        logger.error('Error getting job recommendations:', error);

        if (error instanceof Error && error.message === 'User profile not found') {
            return res.status(404).json({
                error: {
                    code: 'PROFILE_NOT_FOUND',
                    message: 'User profile not found. Please complete your profile first.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'RECOMMENDATIONS_ERROR',
                message: 'Failed to load job recommendations',
                timestamp: new Date().toISOString()
            }
        });
    }
});

export default router;