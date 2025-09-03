# Job Scraping System

## Overview
The job scraping system automatically collects job postings from configured company websites and stores them in the database. It includes deduplication, validation, and automatic scheduling capabilities.

## How Job Scraping is Triggered

### 1. Automatic Scheduling (Recommended)
- Jobs are automatically scraped every 6 hours using a cron schedule
- This is set up when the server starts via `JobQueueService.setupRecurringCrawling()`
- Includes validation of existing jobs to mark unavailable ones

### 2. Manual API Trigger
You can manually trigger job scraping using the API:

```bash
# Trigger basic job scraping
curl -X POST http://localhost:5000/api/jobs/crawl \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger with validation of existing jobs
curl -X POST http://localhost:5000/api/jobs/crawl \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"validateExisting": true}'

# Trigger for specific companies (if supported)
curl -X POST http://localhost:5000/api/jobs/crawl \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companies": ["Example Tech Company"], "validateExisting": true}'
```

### 3. Queue Statistics
Monitor the job scraping queue:

```bash
curl -X GET http://localhost:5000/api/jobs/queue/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:

```env
# Redis Configuration (required for job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # optional
```

### Company Configuration
Job scraping targets are configured in `JobScraperService.companyConfigs`. To add new companies:

1. Add a new `CompanyConfig` object to the array
2. Configure the selectors for the company's job page structure
3. Set up experience level mapping

Example:
```typescript
{
    name: 'Your Company',
    baseUrl: 'https://yourcompany.com/careers',
    jobListingSelector: '.job-item',
    jobSelectors: {
        title: '.job-title',
        location: '.location',
        description: '.description',
        requirements: '.requirements',
        applicationUrl: '.apply-button'
    },
    experienceLevelMapping: {
        'junior': 'entry',
        'senior': 'senior',
        'lead': 'lead'
    }
}
```

## Features

### Deduplication
- Removes duplicate jobs based on title, company, and location
- Updates existing jobs with new information if found again
- Validates job data before saving

### Job Validation
- Checks for required fields (title, company, location, description, URL)
- Validates field lengths and formats
- Ensures application URLs are valid

### Availability Tracking
- Validates existing jobs to check if they're still available
- Marks jobs as unavailable if they can't be found on the original site
- Helps maintain data accuracy

## Monitoring

### Logs
The system logs all scraping activities:
- Job scraping start/completion
- Number of jobs found, deduplicated, and saved
- Errors and warnings
- Queue processing status

### Queue Management
- Uses Bull queue with Redis for reliable job processing
- Automatic retry on failures
- Configurable concurrency and rate limiting
- Queue statistics available via API

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis is running: `redis-server`
   - Check Redis configuration in `.env`

2. **Browser Launch Failed**
   - Install required dependencies for Puppeteer
   - On Linux: `apt-get install -y chromium-browser`

3. **Scraping Failures**
   - Check if target websites have changed their structure
   - Update selectors in company configuration
   - Verify websites are accessible

4. **Queue Not Processing**
   - Check Redis connection
   - Verify queue service initialization
   - Check server logs for errors

### Debug Mode
Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.