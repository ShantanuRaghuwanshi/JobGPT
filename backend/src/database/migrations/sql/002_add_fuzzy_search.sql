-- Migration: Add fuzzy search support with pg_trgm extension
-- Up

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on job titles for better fuzzy search performance  
CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);

-- Create GIN index on company names for better fuzzy search performance
CREATE INDEX idx_jobs_company_trgm ON jobs USING gin (company gin_trgm_ops);

-- Create GIN index on job descriptions for better fuzzy search performance
CREATE INDEX idx_jobs_description_trgm ON jobs USING gin (description gin_trgm_ops);
