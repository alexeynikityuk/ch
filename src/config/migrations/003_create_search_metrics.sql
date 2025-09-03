-- Create search metrics table for tracking daily search counts
CREATE TABLE IF NOT EXISTS search_metrics (
    date DATE PRIMARY KEY,
    search_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_search_metrics_date ON search_metrics(date DESC);