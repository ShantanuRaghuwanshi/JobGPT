#!/usr/bin/env ts-node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import db from '../database/connection';
import { logger } from '../config/logger';

async function addJobsConstraint() {
    try {
        logger.info('🔧 Adding unique constraint to jobs table...');

        // Add unique constraint on application_url
        await db.query(`
            ALTER TABLE jobs 
            ADD CONSTRAINT jobs_application_url_unique 
            UNIQUE (application_url)
        `);

        logger.info('✅ Added unique constraint on application_url');

    } catch (error: any) {
        if (error.code === '42P07') {
            logger.info('ℹ️ Constraint already exists');
        } else {
            logger.error('❌ Failed to add constraint:', error);
            throw error;
        }
    }
}

// Run the script
if (require.main === module) {
    addJobsConstraint()
        .then(() => {
            logger.info('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export default addJobsConstraint;