import puppeteer, { Browser, Page } from 'puppeteer';
import { Job } from '../types/database';
import { logger } from '../config/logger';
import { Pool } from 'pg';

export interface ScrapedJobData {
    title: string;
    company: string;
    companyId: string;
    location: string;
    description: string;
    requirements: string[];
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
    applicationUrl: string;
}

export interface CompanyData {
    id: string;
    name: string;
    domain: string;
    careersUrl: string;
    careersEndpointPayload: any;
    scrapingConfig: any;
}

export class JobScraperService {
    private browser: Browser | null = null;
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async initializeBrowser(): Promise<void> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            logger.info('Browser initialized for job scraping');
        }
    }

    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger.info('Browser closed');
        }
    }

    async scrapeAllCompanies(): Promise<ScrapedJobData[]> {
        await this.initializeBrowser();
        const allJobs: ScrapedJobData[] = [];

        // Get active companies from database
        const companies = await this.getActiveCompanies();

        for (const company of companies) {
            try {
                logger.info(`Scraping jobs from ${company.name}`);
                const jobs = await this.scrapeCompanyJobs(company);
                allJobs.push(...jobs);

                // Update last scraped timestamp
                await this.updateLastScrapedTime(company.id);

                logger.info(`Found ${jobs.length} jobs from ${company.name}`);
            } catch (error) {
                logger.error(`Error scraping ${company.name}:`, error);
            }
        }

        return allJobs;
    }

    private async getActiveCompanies(): Promise<CompanyData[]> {
        const client = await this.db.connect();

        try {
            const result = await client.query(`
                SELECT id, name, domain, careers_url, careers_endpoint_payload, scraping_config
                FROM companies 
                WHERE is_active = true AND careers_url IS NOT NULL
                ORDER BY last_scraped_at ASC NULLS FIRST
            `);

            return result.rows.map(row => {
                const defaultConfig = this.getDefaultScrapingConfig();
                let scrapingConfig = defaultConfig;

                if (row.scraping_config) {
                    try {
                        scrapingConfig = typeof row.scraping_config === 'string'
                            ? JSON.parse(row.scraping_config)
                            : row.scraping_config;
                    } catch (error) {
                        console.warn(`Failed to parse scraping config for company ${row.name}:`, error);
                        scrapingConfig = defaultConfig;
                    }
                }

                return {
                    id: row.id,
                    name: row.name,
                    domain: row.domain,
                    careersUrl: row.careers_url,
                    careersEndpointPayload: row.careers_endpoint_payload || {},
                    scrapingConfig
                };
            });

        } finally {
            client.release();
        }
    }

    private async updateLastScrapedTime(companyId: string): Promise<void> {
        const client = await this.db.connect();

        try {
            await client.query(
                'UPDATE companies SET last_scraped_at = NOW() WHERE id = $1',
                [companyId]
            );
        } finally {
            client.release();
        }
    }

    private getDefaultScrapingConfig(): any {
        return {
            jobListingSelector: '.job, .position, .opening, [data-job], .job-listing, .career-item',
            jobSelectors: {
                title: '.title, .job-title, h2, h3, .position-title, .role-title',
                location: '.location, .job-location, .office, .city',
                description: '.description, .job-description, .summary, .content',
                requirements: '.requirements, .qualifications, .skills, ul li',
                applicationUrl: '.apply, .apply-link, a[href*="apply"], .btn-apply'
            },
            experienceLevelMapping: {
                'junior': 'entry',
                'entry': 'entry',
                'graduate': 'entry',
                'intern': 'entry',
                'mid-level': 'mid',
                'mid': 'mid',
                'intermediate': 'mid',
                'senior': 'senior',
                'sr': 'senior',
                'lead': 'lead',
                'principal': 'lead',
                'staff': 'lead',
                'director': 'lead'
            }
        };
    }

    private async scrapeCompanyJobs(company: CompanyData): Promise<ScrapedJobData[]> {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        // Check if it's an API endpoint or webpage
        const payload = company.careersEndpointPayload;

        if (payload.type === 'api') {
            return await this.scrapeApiJobs(company);
        } else {
            return await this.scrapeWebpageJobs(company);
        }
    }

    private async scrapeApiJobs(company: CompanyData): Promise<ScrapedJobData[]> {
        try {
            const payload = company.careersEndpointPayload;
            const headers = payload.headers || { 'Accept': 'application/json' };

            const response = await fetch(company.careersUrl, {
                method: payload.method || 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return this.parseApiJobData(data, company);

        } catch (error) {
            logger.error(`Error scraping API jobs for ${company.name}:`, error);
            // Fallback to webpage scraping
            return await this.scrapeWebpageJobs(company);
        }
    }

    private parseApiJobData(data: any, company: CompanyData): ScrapedJobData[] {
        const jobs: ScrapedJobData[] = [];

        try {
            // Handle different API response structures
            let jobsArray = data;

            if (data.jobs) jobsArray = data.jobs;
            else if (data.data) jobsArray = data.data;
            else if (data.results) jobsArray = data.results;
            else if (data.positions) jobsArray = data.positions;
            else if (data.openings) jobsArray = data.openings;

            if (!Array.isArray(jobsArray)) {
                logger.warn(`Unexpected API response structure for ${company.name}`);
                return jobs;
            }

            for (const jobData of jobsArray) {
                try {
                    const job = this.parseApiJob(jobData, company);
                    if (job) jobs.push(job);
                } catch (error) {
                    logger.warn('Error parsing API job:', error);
                }
            }

        } catch (error) {
            logger.error('Error parsing API job data:', error);
        }

        return jobs;
    }

    private parseApiJob(jobData: any, company: CompanyData): ScrapedJobData | null {
        try {
            // Extract job fields with common API field names
            const title = jobData.title || jobData.name || jobData.position || jobData.role;
            const location = jobData.location || jobData.office || jobData.city || jobData.remote || 'Remote';
            const description = jobData.description || jobData.summary || jobData.details || '';
            const applicationUrl = jobData.apply_url || jobData.url || jobData.link || company.careersUrl;

            if (!title) return null;

            // Parse requirements
            const requirements = this.parseRequirements(
                jobData.requirements || jobData.qualifications || jobData.skills || description
            );

            // Determine experience level
            const experienceLevel = this.determineExperienceLevel(
                title,
                description,
                company.scrapingConfig.experienceLevelMapping
            );

            return {
                title: title.trim(),
                company: company.name,
                companyId: company.id,
                location: location.toString().trim(),
                description: description.trim(),
                requirements,
                experienceLevel,
                applicationUrl: this.resolveUrl(applicationUrl, company.careersUrl)
            };

        } catch (error) {
            logger.warn('Error parsing individual API job:', error);
            return null;
        }
    }

    private async scrapeWebpageJobs(company: CompanyData): Promise<ScrapedJobData[]> {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        const page = await this.browser.newPage();
        const jobs: ScrapedJobData[] = [];

        try {
            // Set user agent to avoid blocking
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            await page.goto(company.careersUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for job listings to load
            const config = company.scrapingConfig;
            logger.info(`Scraping config for ${company.name}:`, config);

            if (!config || !config.jobListingSelector) {
                throw new Error(`Invalid scraping config for ${company.name}`);
            }

            await page.waitForSelector(config.jobListingSelector, { timeout: 15000 });

            const jobElements = await page.$$(config.jobListingSelector);
            logger.info(`Found ${jobElements.length} job elements for ${company.name}`);

            for (const jobElement of jobElements) {
                try {
                    const jobData = await this.extractJobData(page, jobElement, company);
                    if (jobData) {
                        jobs.push(jobData);
                    }
                } catch (error) {
                    logger.warn('Error extracting job data:', error);
                }
            }
        } catch (error) {
            logger.error(`Error scraping webpage jobs for ${company.name}:`, error);
        } finally {
            await page.close();
        }

        return jobs;
    }

    private async extractJobData(
        page: Page,
        jobElement: any,
        company: CompanyData
    ): Promise<ScrapedJobData | null> {
        try {
            const config = company.scrapingConfig;
            const title = await this.extractText(jobElement, config.jobSelectors.title);
            const location = await this.extractText(jobElement, config.jobSelectors.location);
            const description = await this.extractText(jobElement, config.jobSelectors.description);
            const requirementsText = await this.extractText(jobElement, config.jobSelectors.requirements);
            const applicationUrl = await this.extractAttribute(jobElement, config.jobSelectors.applicationUrl, 'href');

            if (!title) {
                logger.warn('Missing job title, skipping');
                return null;
            }

            // Parse requirements from text
            const requirements = this.parseRequirements(requirementsText);

            // Determine experience level
            const experienceLevel = this.determineExperienceLevel(title, description, config.experienceLevelMapping);

            return {
                title: title.trim(),
                company: company.name,
                companyId: company.id,
                location: location?.trim() || 'Not specified',
                description: description?.trim() || '',
                requirements,
                experienceLevel,
                applicationUrl: this.resolveUrl(applicationUrl || company.careersUrl, company.careersUrl)
            };
        } catch (error) {
            logger.error('Error extracting job data:', error);
            return null;
        }
    }

    private async extractText(element: any, selector: string): Promise<string> {
        try {
            const textElement = await element.$(selector);
            if (textElement) {
                return await textElement.evaluate((el: any) => el.textContent || '');
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    private async extractAttribute(element: any, selector: string, attribute: string): Promise<string> {
        try {
            const attrElement = await element.$(selector);
            if (attrElement) {
                return await attrElement.evaluate((el: any, attr: string) =>
                    el.getAttribute(attr) || '', attribute);
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    private parseRequirements(requirementsText: string): string[] {
        if (!requirementsText) return [];

        // Split by common delimiters and clean up
        return requirementsText
            .split(/[•\n\r-]/)
            .map(req => req.trim())
            .filter(req => req.length > 0 && req.length < 200)
            .slice(0, 10); // Limit to 10 requirements
    }

    private determineExperienceLevel(
        title: string,
        description: string,
        mapping: Record<string, 'entry' | 'mid' | 'senior' | 'lead'>
    ): 'entry' | 'mid' | 'senior' | 'lead' {
        const text = (title + ' ' + description).toLowerCase();

        // Check for explicit level indicators
        for (const [keyword, level] of Object.entries(mapping)) {
            if (text.includes(keyword.toLowerCase())) {
                return level;
            }
        }

        // Fallback logic based on common patterns
        if (text.includes('junior') || text.includes('entry') || text.includes('graduate')) {
            return 'entry';
        }
        if (text.includes('senior') || text.includes('sr.')) {
            return 'senior';
        }
        if (text.includes('lead') || text.includes('principal') || text.includes('staff')) {
            return 'lead';
        }

        // Default to mid-level
        return 'mid';
    }

    private resolveUrl(url: string, baseUrl: string): string {
        if (!url || url.startsWith('http')) {
            return url || baseUrl;
        }

        try {
            const base = new URL(baseUrl);
            return new URL(url, base.origin).toString();
        } catch (error) {
            return baseUrl;
        }
    }

    // Method to validate if a job still exists on the website
    async validateJobExists(job: Job): Promise<boolean> {
        if (!this.browser) {
            await this.initializeBrowser();
        }

        const page = await this.browser!.newPage();

        try {
            const response = await page.goto(job.applicationUrl, {
                waitUntil: 'networkidle2',
                timeout: 10000
            });

            // Check if page loads successfully and doesn't show 404 or job not found
            if (!response || response.status() >= 400) {
                return false;
            }

            // Look for common "job not found" indicators
            const pageContent = await page.content();
            const notFoundIndicators = [
                'job not found',
                'position no longer available',
                '404',
                'page not found',
                'expired'
            ];

            const hasNotFoundIndicator = notFoundIndicators.some(indicator =>
                pageContent.toLowerCase().includes(indicator)
            );

            return !hasNotFoundIndicator;
        } catch (error) {
            logger.warn(`Error validating job ${job.id}:`, error);
            return false;
        } finally {
            await page.close();
        }
    }
}