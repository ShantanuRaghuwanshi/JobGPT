# Company Discovery System

## Overview

The new company discovery system replaces the static hardcoded company list with a dynamic approach that uses search engines to discover companies and their career pages automatically.

## Architecture

### 1. Company Discovery Service (`companyDiscovery.ts`)
- Uses multiple search engines (Google, Bing, SerpApi) to find companies
- Extracts company information from search results
- Discovers career page URLs and API endpoints
- Stores discovered companies in the database

### 2. Job Automation Service (`jobAutomation.ts`)
- Orchestrates the full discovery and scraping pipeline
- Manages company discovery, endpoint detection, and job scraping
- Provides statistics and management functions

### 3. Updated Job Scraper (`jobScraper.ts`)
- Works with dynamically discovered companies from database
- Supports both API endpoints and webpage scraping
- Uses adaptive selectors for different website structures
- Handles various job board formats

### 4. Database Schema
New `companies` table stores:
- Company name and domain
- Career page URLs
- API endpoint configurations
- Scraping configurations
- Discovery metadata

## Key Features

### Dynamic Company Discovery
- Search engines find companies based on job-related queries
- Automatically extracts company names and domains
- Filters out job boards to focus on actual companies

### Adaptive Career Page Detection
- Searches for career pages using multiple strategies
- Detects API endpoints vs. webpage scraping needs
- Stores endpoint configurations for future use

### Flexible Job Scraping
- Handles both API responses and HTML scraping
- Uses configurable selectors that adapt to different sites
- Fallback mechanisms when primary methods fail

### Search Engine Integration
Configure API keys in `.env`:
```bash
# Search Engine APIs for Company Discovery
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id
BING_SEARCH_API_KEY=your-bing-search-api-key
SERPAPI_KEY=your-serpapi-key
```

## Usage

### 1. Add Sample Companies (for testing)
```bash
npm run add-companies
```

### 2. Test Job Scraping
```bash
npm run test-scraping
```

### 3. Test Company Discovery (requires API keys)
```bash
npm run test-discovery
```

### 4. API Endpoints

#### Discover Companies
```bash
POST /api/jobs/discover-companies
{
  "searchQueries": [
    "software engineer jobs San Francisco",
    "data scientist careers remote"
  ]
}
```

#### Add Specific Company
```bash
POST /api/jobs/add-company
{
  "companyName": "Stripe"
}
```

#### Get Company Statistics
```bash
GET /api/jobs/company-stats
```

#### Scrape Specific Company
```bash
POST /api/jobs/scrape-company/:companyId
```

## Error Handling

The system handles common scraping errors:

### `net::ERR_NAME_NOT_RESOLVED`
- **Cause**: Hardcoded URLs that don't exist
- **Solution**: Dynamic discovery finds real, working URLs

### Selector Not Found
- **Cause**: Website structure changes
- **Solution**: Adaptive selectors try multiple patterns

### Rate Limiting
- **Cause**: Too many requests to career sites
- **Solution**: Built-in delays and retry mechanisms

## Configuration

### Default Scraping Configuration
The system uses adaptive selectors that work across different career sites:

```javascript
{
  jobListingSelector: '.job, .position, .opening, [data-job], .job-listing, .career-item',
  jobSelectors: {
    title: '.title, .job-title, h2, h3, .position-title, .role-title',
    location: '.location, .job-location, .office, .city',
    description: '.description, .job-description, .summary, .content',
    requirements: '.requirements, .qualifications, .skills, ul li',
    applicationUrl: '.apply, .apply-link, a[href*="apply"], .btn-apply'
  }
}
```

### Experience Level Mapping
```javascript
{
  'junior': 'entry',
  'entry': 'entry',
  'graduate': 'entry',
  'senior': 'senior',
  'lead': 'lead',
  'principal': 'lead'
}
```

## Benefits

1. **Scalability**: Automatically discovers new companies
2. **Reliability**: No more broken hardcoded URLs
3. **Adaptability**: Handles different website structures
4. **Maintenance**: Reduces manual configuration needs
5. **Coverage**: Finds companies you might not know about

## Future Enhancements

1. **Machine Learning**: Learn optimal selectors from successful scrapes
2. **Company Validation**: Verify company legitimacy and size
3. **Industry Classification**: Categorize companies by industry
4. **Geographic Filtering**: Focus on specific regions
5. **Job Quality Scoring**: Rank companies by job quality metrics