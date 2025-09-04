-- Python scraper support migration
-- Add unique constraint for application_url to enable ON CONFLICT upserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_jobs_application_url_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_jobs_application_url_unique ON jobs (application_url) WHERE application_url IS NOT NULL;
    END IF;
END $$;

-- Create scraping_runs table if not exists
CREATE TABLE IF NOT EXISTS scraping_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    companies_scraped INTEGER DEFAULT 0,
    jobs_scraped INTEGER DEFAULT 0,
    jobs_inserted INTEGER DEFAULT 0,
    jobs_updated INTEGER DEFAULT 0,
    jobs_marked_unavailable INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraping_runs_status ON scraping_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_runs_started_at ON scraping_runs(started_at);
