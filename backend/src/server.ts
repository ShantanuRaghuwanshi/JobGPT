// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import llmRoutes from './routes/llm';
import jobsRoutes from './routes/jobs';
import applicationsRoutes from './routes/applications';
import pipelineRoutes from './routes/pipeline';
import dashboardRoutes from './routes/dashboard';
import scrapingRoutes from './routes/scraping';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { JobQueueService } from './services/jobQueue';
import { JobRepository } from './database/repositories/job';
import db from './database/connection';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/scraping', scrapingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize job queue service for automatic scraping
let jobQueueService: JobQueueService | null = null;

async function initializeJobQueue() {
    try {
        const jobRepository = new JobRepository();
        // Get the pool from the database connection
        const pool = db.getPool();
        jobQueueService = new JobQueueService(jobRepository, pool);

        // Set up recurring job crawling (every 6 hours)
        jobQueueService.setupRecurringCrawling();

        logger.info('✅ Job queue service initialized with recurring crawling');
    } catch (error) {
        logger.error('❌ Failed to initialize job queue service:', error);
    }
}

// Graceful shutdown handler
// async function gracefulShutdown(signal: string) {
//     logger.info(`🛑 Received ${signal}, shutting down gracefully...`);

//     if (jobQueueService) {
//         try {
//             await jobQueueService.cleanup();
//             logger.info('✅ Job queue service cleaned up');
//         } catch (error) {
//             logger.error('❌ Error cleaning up job queue service:', error);
//         }
//     }

//     process.exit(0);
// }

// // Register shutdown handlers
// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if this file is run directly
if (require.main === module) {
    (async () => {
        // Check DB connection before starting server
        try {
            const isDbConnected = await db.testConnection();
            if (!isDbConnected) {
                logger.error('❌ Database connection failed. Server startup aborted.');
                process.exit(1);
            }
            logger.info('✅ Database connection successful.');
        } catch (err) {
            logger.error('❌ Error during database connection check:', err);
            process.exit(1);
        }

        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
            // Initialize job queue after server starts
            // await initializeJobQueue();
        });
    })();
}

export default app;