-- Create table for caching company officer data
CREATE TABLE IF NOT EXISTS company_officers_cache (
    company_number VARCHAR(20) PRIMARY KEY,
    officers_data JSONB NOT NULL,
    total_results INTEGER,
    active_count INTEGER,
    resigned_count INTEGER,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Index for finding expired entries
CREATE INDEX IF NOT EXISTS idx_officers_cache_expires ON company_officers_cache(expires_at);

-- Index for tracking when data was fetched
CREATE INDEX IF NOT EXISTS idx_officers_cache_fetched ON company_officers_cache(fetched_at DESC);