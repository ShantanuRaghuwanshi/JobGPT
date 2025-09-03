import { Pool } from 'pg';
import { logger } from '../config/logger';
import { CompanyDiscoveryService } from './companyDiscovery';
import { JobScraperService, ScrapedJobData } from './jobScraper';

export class JobAutomationService {
    private db: Pool;
    private companyDiscovery: CompanyDiscoveryService;
    private jobScraper: JobScraperService;

    constructor(db: Pool) {
        this.db = db;
        this.companyDiscovery = new CompanyDiscoveryService(db);
        this.jobScraper = new JobScraperService(db);
    }

    async runFullJobDiscoveryPipeline(searchQueries: string[]): Promise<void> {
        try {
            logger.info('Starting full job discovery pipeline');

            // Step 1: Discover companies using search engines
            for (const query of searchQueries) {
                logger.info(`Discovering companies for query: ${query}`);
                await this.companyDiscovery.discoverCompaniesFromSearch(query, 20);
            }

            // Step 2: Discover careers endpoints for companies without them
            await this.discoverCareersEndpoints();

            // Step 3: Scrape jobs from all active companies
            const scrapedJobs = await this.jobScraper.scrapeAllCompanies();

            // Step 4: Save scraped jobs to database
            await this.saveScrapedJobs(scrapedJobs);

            logger.info(`Pipeline completed. Scraped ${scrapedJobs.length} jobs total`);

        } catch (error) {
            logger.error('Error in job discovery pipeline:', error);
            throw error;
        } finally {
            await this.jobScraper.closeBrowser();
        }
    }

    private async discoverCareersEndpoints(): Promise<void> {
        const client = await this.db.connect();

        try {
            // Get companies without careers URLs
            const result = await client.query(`
                SELECT id FROM companies 
                WHERE is_active = true AND (careers_url IS NULL OR careers_url = '')
                LIMIT 10
            `);

            for (const row of result.rows) {
                try {
                    await this.companyDiscovery.discoverCareersEndpoints(row.id);
                } catch (error) {
                    logger.warn(`Failed to discover careers endpoint for company ${row.id}:`, error);
                }
            }

        } finally {
            client.release();
        }
    }

    private async saveScrapedJobs(scrapedJobs: ScrapedJobData[]): Promise<void> {
        const client = await this.db.connect();

        try {
            await client.query('BEGIN');

            for (const job of scrapedJobs) {
                await client.query(`
                    INSERT INTO jobs (
                        title, company_id, company, location, description, 
                        requirements, experience_level, application_url, is_available
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                    ON CONFLICT (application_url) DO UPDATE SET
                        title = EXCLUDED.title,
                        location = EXCLUDED.location,
                        description = EXCLUDED.description,
                        requirements = EXCLUDED.requirements,
                        experience_level = EXCLUDED.experience_level,
                        is_available = true,
                        updated_at = NOW()
                `, [
                    job.title,
                    job.companyId,
                    job.company,
                    job.location,
                    job.description,
                    job.requirements,
                    job.experienceLevel,
                    job.applicationUrl
                ]);
            }

            await client.query('COMMIT');
            logger.info(`Saved ${scrapedJobs.length} jobs to database`);

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error saving scraped jobs:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getCompanyStats(): Promise<any> {
        const client = await this.db.connect();

        try {
            const stats = await client.query(`
                SELECT 
                    COUNT(*) as total_companies,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_companies,
                    COUNT(CASE WHEN careers_url IS NOT NULL THEN 1 END) as companies_with_careers_url,
                    COUNT(CASE WHEN last_scraped_at IS NOT NULL THEN 1 END) as scraped_companies
                FROM companies
            `);

            const jobStats = await client.query(`
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN is_available = true THEN 1 END) as available_jobs,
                    COUNT(DISTINCT company_id) as companies_with_jobs
                FROM jobs
            `);

            return {
                companies: stats.rows[0],
                jobs: jobStats.rows[0]
            };

        } finally {
            client.release();
        }
    }

    async searchAndAddCompany(companyName: string): Promise<void> {
        try {
            const searchQuery = `"${companyName}" careers jobs hiring`;
            await this.companyDiscovery.discoverCompaniesFromSearch(searchQuery, 5);

            // Try to find careers endpoint for the newly added company
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'SELECT id FROM companies WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT 1',
                    [`%${companyName}%`]
                );

                if (result.rows.length > 0) {
                    await this.companyDiscovery.discoverCareersEndpoints(result.rows[0].id);
                }
            } finally {
                client.release();
            }

        } catch (error) {
            logger.error(`Error adding company ${companyName}:`, error);
            throw error;
        }
    }

    async scrapeSpecificCompany(companyId: string): Promise<ScrapedJobData[]> {
        try {
            const client = await this.db.connect();
            let company;

            try {
                const result = await client.query(
                    'SELECT id, name, domain, careers_url, careers_endpoint_payload, scraping_config FROM companies WHERE id = $1',
                    [companyId]
                );

                if (result.rows.length === 0) {
                    throw new Error('Company not found');
                }

                company = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    domain: result.rows[0].domain,
                    careersUrl: result.rows[0].careers_url,
                    careersEndpointPayload: result.rows[0].careers_endpoint_payload || {},
                    scrapingConfig: result.rows[0].scraping_config || {}
                };
            } finally {
                client.release();
            }

            await this.jobScraper.initializeBrowser();
            const jobs = await this.jobScraper['scrapeCompanyJobs'](company);
            await this.saveScrapedJobs(jobs);

            return jobs;

        } catch (error) {
            logger.error(`Error scraping company ${companyId}:`, error);
            throw error;
        } finally {
            await this.jobScraper.closeBrowser();
        }
    }
}