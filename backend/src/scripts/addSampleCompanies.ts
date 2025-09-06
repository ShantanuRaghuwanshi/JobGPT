#!/usr/bin/env ts-node

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import db from '../database/connection';
import { logger } from '../config/logger';

const sampleCompanies = [
    {
        name: 'Google',
        domain: 'google.com',
        careersUrl: 'https://careers.google.com/jobs/results/',
        discoverySource: 'manual'
    },
    {
        name: 'Microsoft',
        domain: 'microsoft.com',
        careersUrl: 'https://careers.microsoft.com/us/en/search-results',
        discoverySource: 'manual'
    },
    {
        name: 'Apple',
        domain: 'apple.com',
        careersUrl: 'https://jobs.apple.com/en-us/search',
        discoverySource: 'manual'
    },
    {
        name: 'Amazon',
        domain: 'amazon.com',
        careersUrl: 'https://www.amazon.jobs/en/search',
        discoverySource: 'manual'
    },
    {
        name: 'Meta',
        domain: 'meta.com',
        careersUrl: 'https://www.metacareers.com/jobs/',
        discoverySource: 'manual'
    },
    {
        name: 'Netflix',
        domain: 'netflix.com',
        careersUrl: 'https://jobs.netflix.com/search',
        discoverySource: 'manual'
    },
    {
        name: 'Spotify',
        domain: 'spotify.com',
        careersUrl: 'https://www.lifeatspotify.com/jobs',
        discoverySource: 'manual'
    },
    {
        name: 'Airbnb',
        domain: 'airbnb.com',
        careersUrl: 'https://careers.airbnb.com/positions/',
        discoverySource: 'manual'
    },
    {
        name: 'Uber',
        domain: 'uber.com',
        careersUrl: 'https://www.uber.com/us/en/careers/list/',
        discoverySource: 'manual'
    },
    {
        name: 'Stripe',
        domain: 'stripe.com',
        careersUrl: 'https://stripe.com/jobs/search',
        discoverySource: 'manual'
    }
];

async function addSampleCompanies() {
    const client = await db.getPool().connect();

    try {
        logger.info('🏢 Adding sample companies...');

        await client.query('BEGIN');

        for (const company of sampleCompanies) {
            await client.query(`
                INSERT INTO companies (name, domain, careers_url, discovery_source, is_active, careers_endpoint_payload)
                VALUES ($1, $2, $3, $4, true, $5)
                ON CONFLICT (name) DO UPDATE SET
                    domain = EXCLUDED.domain,
                    careers_url = EXCLUDED.careers_url,
                    discovery_source = EXCLUDED.discovery_source,
                    updated_at = NOW()
            `, [
                company.name,
                company.domain,
                company.careersUrl,
                company.discoverySource,
                JSON.stringify({ type: 'webpage', method: 'GET' })
            ]);

            logger.info(`✅ Added ${company.name}`);
        }

        await client.query('COMMIT');

        logger.info(`🎉 Successfully added ${sampleCompanies.length} sample companies!`);

        // Show stats
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_companies,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_companies,
                COUNT(CASE WHEN careers_url IS NOT NULL THEN 1 END) as companies_with_careers_url
            FROM companies
        `);

        logger.info('📊 Company stats:', stats.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('❌ Error adding sample companies:', error);
        throw error;
    } finally {
        client.release();
        await db.close();
    }
}

// Run the script
addSampleCompanies()
    .then(() => {
        logger.info('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('❌ Script failed:', error);
        process.exit(1);
    });