#!/usr/bin/env ts-node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import { JobAutomationService } from '../services/jobAutomation';
import db from '../database/connection';
import { logger } from '../config/logger';

async function testJobScraping() {
    const client = await db.getPool().connect();

    try {
        logger.info('🚀 Starting job scraping test...');

        const pool = db.getPool();
        const automationService = new JobAutomationService(pool);

        // Get a sample company to test with
        const companyResult = await client.query(`
            SELECT id, name, careers_url 
            FROM companies 
            WHERE is_active = true AND careers_url IS NOT NULL 
            LIMIT 1
        `);

        if (companyResult.rows.length === 0) {
            logger.error('❌ No companies found. Please run addSampleCompanies.ts first.');
            return;
        }

        const company = companyResult.rows[0];
        logger.info(`🏢 Testing job scraping for: ${company.name}`);
        logger.info(`🔗 Careers URL: ${company.careers_url}`);

        logger.info('📊 Getting initial job stats...');
        const initialStats = await automationService.getCompanyStats();
        logger.info('Initial stats:', initialStats);

        logger.info('🔍 Scraping jobs from company...');
        const scrapedJobs = await automationService.scrapeSpecificCompany(company.id);

        logger.info(`✅ Scraped ${scrapedJobs.length} jobs from ${company.name}`);

        // Show some sample jobs
        if (scrapedJobs.length > 0) {
            logger.info('📋 Sample scraped jobs:');
            scrapedJobs.slice(0, 3).forEach((job, index) => {
                logger.info(`${index + 1}. ${job.title} - ${job.location}`);
                logger.info(`   Company: ${job.company}`);
                logger.info(`   Experience: ${job.experienceLevel}`);
                logger.info(`   URL: ${job.applicationUrl}`);
                logger.info('');
            });
        }

        logger.info('📊 Getting final job stats...');
        const finalStats = await automationService.getCompanyStats();
        logger.info('Final stats:', finalStats);

        logger.info('✅ Job scraping test completed successfully!');

    } catch (error) {
        logger.error('❌ Job scraping test failed:', error);

        if (error instanceof Error) {
            if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
                logger.info('💡 This error is expected if the careers URL is not accessible');
                logger.info('💡 The new system will handle this by discovering real, working URLs');
            } else if (error.message.includes('waiting for selector')) {
                logger.info('💡 This error indicates the page structure is different than expected');
                logger.info('💡 The new system uses adaptive selectors to handle this');
            }
        }
    } finally {
        client.release();
        await db.close();
        process.exit(0);
    }
}

// Run the test
testJobScraping();