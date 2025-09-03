#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { JobAutomationService } from '../services/jobAutomation';
import db from '../database/connection';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

async function testCompanyDiscovery() {
    try {
        logger.info('🚀 Starting company discovery test...');

        const pool = db.getPool();
        const automationService = new JobAutomationService(pool);

        // Test search queries
        const searchQueries = [
            'software engineer jobs San Francisco',
            'data scientist careers remote',
            'product manager hiring NYC'
        ];

        logger.info('📊 Getting initial stats...');
        const initialStats = await automationService.getCompanyStats();
        logger.info('Initial stats:', initialStats);

        logger.info('🔍 Running company discovery pipeline...');
        await automationService.runFullJobDiscoveryPipeline(searchQueries);

        logger.info('📊 Getting final stats...');
        const finalStats = await automationService.getCompanyStats();
        logger.info('Final stats:', finalStats);

        logger.info('✅ Company discovery test completed successfully!');

    } catch (error) {
        logger.error('❌ Company discovery test failed:', error);
        process.exit(1);
    } finally {
        await db.close();
        process.exit(0);
    }
}

// Run the test
testCompanyDiscovery();