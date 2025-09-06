#!/usr/bin/env ts-node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import db from '../database/connection';
import { logger } from '../config/logger';

async function updateGoogleScrapingConfig() {
    try {
        logger.info('🔧 Updating Google scraping configuration...');

        // Google-specific scraping configuration
        const googleConfig = {
            jobListingSelector: '[data-job-id], .job-tile, .lLd3Je',
            jobSelectors: {
                title: 'h3, .job-title, [data-automation-id="jobTitle"]',
                location: '.job-location, [data-automation-id="jobLocation"], .location',
                description: '.job-description, .description, [data-automation-id="jobDescription"]',
                requirements: '.requirements, .qualifications, ul li',
                applicationUrl: '.apply-button, .apply-link, a[href*="apply"]'
            },
            experienceLevelMapping: {
                'entry': 'entry',
                'junior': 'entry',
                'graduate': 'entry',
                'intern': 'entry',
                'mid': 'mid',
                'mid-level': 'mid',
                'intermediate': 'mid',
                'senior': 'senior',
                'sr': 'senior',
                'lead': 'lead',
                'staff': 'lead',
                'principal': 'lead',
                'director': 'lead'
            }
        };

        const result = await db.query(`
            UPDATE companies 
            SET scraping_config = $1,
                updated_at = NOW()
            WHERE name = 'Google'
            RETURNING id, name
        `, [JSON.stringify(googleConfig)]);

        if (result.rows.length > 0) {
            logger.info('✅ Updated Google scraping configuration', {
                companyId: result.rows[0].id,
                companyName: result.rows[0].name
            });
        } else {
            logger.warn('⚠️ Google company not found in database');
        }

        logger.info('✅ Configuration update completed');

    } catch (error) {
        logger.error('❌ Failed to update Google configuration:', error);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    updateGoogleScrapingConfig()
        .then(() => {
            logger.info('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export default updateGoogleScrapingConfig;