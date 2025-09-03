import axios from 'axios';
import { logger } from '../config/logger';
import { Pool } from 'pg';

export interface DiscoveredCompany {
    name: string;
    domain: string;
    careersUrl?: string;
    discoverySource: string;
}

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

export class CompanyDiscoveryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async discoverCompaniesFromSearch(
        searchQuery: string,
        maxResults: number = 50
    ): Promise<DiscoveredCompany[]> {
        const companies: DiscoveredCompany[] = [];

        try {
            // Try multiple search engines for better coverage
            const searchEngines = [
                () => this.searchWithGoogle(searchQuery, maxResults),
                () => this.searchWithBing(searchQuery, maxResults),
                () => this.searchWithSerpApi(searchQuery, maxResults)
            ];

            for (const searchEngine of searchEngines) {
                try {
                    const results = await searchEngine();
                    const discoveredCompanies = await this.extractCompaniesFromResults(results);
                    companies.push(...discoveredCompanies);

                    if (companies.length >= maxResults) break;
                } catch (error) {
                    logger.warn('Search engine failed, trying next:', error);
                }
            }

            // Remove duplicates and save to database
            const uniqueCompanies = this.removeDuplicateCompanies(companies);
            await this.saveDiscoveredCompanies(uniqueCompanies);

            logger.info(`Discovered ${uniqueCompanies.length} unique companies`);
            return uniqueCompanies;

        } catch (error) {
            logger.error('Error in company discovery:', error);
            throw error;
        }
    }

    private async searchWithGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            throw new Error('Google Search API credentials not configured');
        }

        const searchQuery = `${query} careers jobs site:linkedin.com OR site:glassdoor.com OR "careers" OR "jobs"`;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=${Math.min(maxResults, 10)}`;

        const response = await axios.get(url);

        return response.data.items?.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        })) || [];
    }

    private async searchWithBing(query: string, maxResults: number): Promise<SearchResult[]> {
        const apiKey = process.env.BING_SEARCH_API_KEY;

        if (!apiKey) {
            throw new Error('Bing Search API key not configured');
        }

        const searchQuery = `${query} careers jobs hiring`;
        const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=${Math.min(maxResults, 50)}`;

        const response = await axios.get(url, {
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey
            }
        });

        return response.data.webPages?.value?.map((item: any) => ({
            title: item.name,
            link: item.url,
            snippet: item.snippet
        })) || [];
    }

    private async searchWithSerpApi(query: string, maxResults: number): Promise<SearchResult[]> {
        const apiKey = process.env.SERPAPI_KEY;

        if (!apiKey) {
            throw new Error('SerpApi key not configured');
        }

        const searchQuery = `${query} careers jobs hiring`;
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}&num=${Math.min(maxResults, 100)}`;

        const response = await axios.get(url);

        return response.data.organic_results?.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        })) || [];
    }

    private async extractCompaniesFromResults(results: SearchResult[]): Promise<DiscoveredCompany[]> {
        const companies: DiscoveredCompany[] = [];

        for (const result of results) {
            try {
                const company = await this.extractCompanyFromResult(result);
                if (company) {
                    companies.push(company);
                }
            } catch (error) {
                logger.warn('Error extracting company from result:', error);
            }
        }

        return companies;
    }

    private async extractCompanyFromResult(result: SearchResult): Promise<DiscoveredCompany | null> {
        try {
            const url = new URL(result.link);
            const domain = url.hostname.replace('www.', '');

            // Skip job boards and generic sites
            const skipDomains = [
                'linkedin.com', 'glassdoor.com', 'indeed.com', 'monster.com',
                'ziprecruiter.com', 'careerbuilder.com', 'simplyhired.com',
                'jobsearch.com', 'workable.com', 'lever.co', 'greenhouse.io'
            ];

            if (skipDomains.some(skipDomain => domain.includes(skipDomain))) {
                // Extract company name from job board listings
                return this.extractCompanyFromJobBoard(result);
            }

            // Extract company name from title and URL
            const companyName = this.extractCompanyName(result.title, domain);

            if (!companyName) return null;

            // Check if this looks like a careers page
            const isCareersPage = this.isCareersUrl(result.link, result.title, result.snippet);

            return {
                name: companyName,
                domain: domain,
                careersUrl: isCareersPage ? result.link : undefined,
                discoverySource: 'search_engine'
            };

        } catch (error) {
            logger.warn('Error parsing result URL:', error);
            return null;
        }
    }

    private extractCompanyFromJobBoard(result: SearchResult): DiscoveredCompany | null {
        // Extract company names from job board titles
        const patterns = [
            /at\s+([A-Z][a-zA-Z\s&.,-]+?)(?:\s*[-|]|\s*$)/,
            /([A-Z][a-zA-Z\s&.,-]+?)\s+(?:jobs|careers|hiring)/i,
            /Jobs at\s+([A-Z][a-zA-Z\s&.,-]+)/i
        ];

        for (const pattern of patterns) {
            const match = result.title.match(pattern);
            if (match && match[1]) {
                const companyName = match[1].trim();
                if (companyName.length > 2 && companyName.length < 100) {
                    return {
                        name: companyName,
                        domain: '',
                        discoverySource: 'job_board'
                    };
                }
            }
        }

        return null;
    }

    private extractCompanyName(title: string, domain: string): string | null {
        // Try to extract company name from title
        const titlePatterns = [
            /^([A-Z][a-zA-Z\s&.,-]+?)\s*[-|]/,
            /([A-Z][a-zA-Z\s&.,-]+?)\s+Careers/i,
            /([A-Z][a-zA-Z\s&.,-]+?)\s+Jobs/i
        ];

        for (const pattern of titlePatterns) {
            const match = title.match(pattern);
            if (match && match[1]) {
                const name = match[1].trim();
                if (name.length > 2 && name.length < 100) {
                    return name;
                }
            }
        }

        // Fallback: use domain name
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
            const companyPart = domainParts[domainParts.length - 2];
            return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
        }

        return null;
    }

    private isCareersUrl(url: string, title: string, snippet: string): boolean {
        const careersKeywords = ['careers', 'jobs', 'hiring', 'employment', 'opportunities'];
        const text = (url + ' ' + title + ' ' + snippet).toLowerCase();

        return careersKeywords.some(keyword => text.includes(keyword));
    }

    private removeDuplicateCompanies(companies: DiscoveredCompany[]): DiscoveredCompany[] {
        const seen = new Set<string>();
        const unique: DiscoveredCompany[] = [];

        for (const company of companies) {
            const key = company.domain || company.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(company);
            }
        }

        return unique;
    }

    private async saveDiscoveredCompanies(companies: DiscoveredCompany[]): Promise<void> {
        const client = await this.db.connect();

        try {
            await client.query('BEGIN');

            for (const company of companies) {
                await client.query(`
                    INSERT INTO companies (name, domain, careers_url, discovery_source, is_active)
                    VALUES ($1, $2, $3, $4, true)
                    ON CONFLICT (name) DO UPDATE SET
                        domain = EXCLUDED.domain,
                        careers_url = COALESCE(EXCLUDED.careers_url, companies.careers_url),
                        discovery_source = EXCLUDED.discovery_source,
                        updated_at = NOW()
                `, [company.name, company.domain, company.careersUrl, company.discoverySource]);
            }

            await client.query('COMMIT');
            logger.info(`Saved ${companies.length} companies to database`);

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error saving companies:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async discoverCareersEndpoints(companyId: string): Promise<void> {
        const client = await this.db.connect();

        try {
            // Get company info
            const companyResult = await client.query(
                'SELECT * FROM companies WHERE id = $1',
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                throw new Error('Company not found');
            }

            const company = companyResult.rows[0];
            const careersInfo = await this.findCareersEndpoint(company);

            // Update company with careers endpoint info
            await client.query(`
                UPDATE companies 
                SET careers_url = $1, careers_endpoint_payload = $2, updated_at = NOW()
                WHERE id = $3
            `, [careersInfo.url, JSON.stringify(careersInfo.payload), companyId]);

            logger.info(`Updated careers endpoint for ${company.name}`);

        } catch (error) {
            logger.error('Error discovering careers endpoint:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    private async findCareersEndpoint(company: any): Promise<{ url: string; payload: any }> {
        const searchQueries = [
            `site:${company.domain} careers`,
            `site:${company.domain} jobs`,
            `"${company.name}" careers API`,
            `"${company.name}" jobs endpoint`
        ];

        for (const query of searchQueries) {
            try {
                const results = await this.searchWithGoogle(query, 5);

                for (const result of results) {
                    if (this.isCareersUrl(result.link, result.title, result.snippet)) {
                        // Try to detect if it's an API endpoint
                        const payload = await this.analyzeEndpoint(result.link);

                        return {
                            url: result.link,
                            payload: payload
                        };
                    }
                }
            } catch (error) {
                logger.warn(`Search failed for query: ${query}`, error);
            }
        }

        // Fallback: construct likely careers URL
        const fallbackUrl = company.domain ?
            `https://${company.domain}/careers` :
            `https://www.google.com/search?q="${company.name}"+careers`;

        return {
            url: fallbackUrl,
            payload: { type: 'webpage', method: 'GET' }
        };
    }

    private async analyzeEndpoint(url: string): Promise<any> {
        try {
            // Check if URL looks like an API endpoint
            if (url.includes('/api/') || url.includes('.json') || url.includes('/v1/') || url.includes('/v2/')) {
                return {
                    type: 'api',
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                };
            }

            // Default to webpage scraping
            return {
                type: 'webpage',
                method: 'GET',
                selectors: {
                    jobListing: '.job, .position, .opening, [data-job]',
                    title: '.title, .job-title, h2, h3',
                    location: '.location, .job-location',
                    description: '.description, .job-description',
                    applyLink: '.apply, .apply-link, a[href*="apply"]'
                }
            };

        } catch (error) {
            logger.warn('Error analyzing endpoint:', error);
            return { type: 'webpage', method: 'GET' };
        }
    }
}