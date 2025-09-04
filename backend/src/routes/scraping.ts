import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import db from '../database/connection';

const router = Router();

// GET /api/scraping/status - latest run summary
router.get('/status', async (_req: Request, res: Response) => {
    const client = await db.getPool().connect();
    try {
        const result = await client.query(`
            SELECT id, status, started_at, finished_at, companies_scraped, jobs_scraped, jobs_inserted, jobs_updated, jobs_marked_unavailable
            FROM scraping_runs
            ORDER BY started_at DESC NULLS LAST
            LIMIT 1
        `);
        res.json({ success: true, data: result.rows[0] || null });
    } catch (error) {
        logger.error('Error fetching scraping status', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    } finally {
        client.release();
    }
});

// GET /api/scraping/runs - recent runs
router.get('/runs', async (_req: Request, res: Response) => {
    const client = await db.getPool().connect();
    try {
        const result = await client.query(`
            SELECT id, status, started_at, finished_at, companies_scraped, jobs_scraped, jobs_inserted, jobs_updated, jobs_marked_unavailable
            FROM scraping_runs
            ORDER BY started_at DESC NULLS LAST
            LIMIT 20
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error('Error fetching scraping runs', error);
        res.status(500).json({ error: 'Failed to fetch runs' });
    } finally {
        client.release();
    }
});

// POST /api/scraping/trigger - queue a new run
router.post('/trigger', async (_req: Request, res: Response) => {
    const client = await db.getPool().connect();
    try {
        const result = await client.query(`
            INSERT INTO scraping_runs (status) VALUES ('queued') RETURNING id
        `);
        const runId = result.rows[0].id;
        logger.info(`Queued scraping run ${runId}`);
        res.json({ success: true, runId });
    } catch (error) {
        logger.error('Error queuing scraping run', error);
        res.status(500).json({ error: 'Failed to queue run' });
    } finally {
        client.release();
    }
});

export default router;
