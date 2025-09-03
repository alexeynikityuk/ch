-- Create database if not exists
-- CREATE DATABASE companies_house_app;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create filter_presets table
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search_snapshots table
CREATE TABLE IF NOT EXISTS search_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  results JSONB
);

-- Create companies table (optional, for caching)
CREATE TABLE IF NOT EXISTS companies (
  company_number TEXT PRIMARY KEY,
  company_name TEXT,
  status TEXT,
  type TEXT,
  sic_codes TEXT[],
  incorporation_date DATE,
  locality TEXT,
  postal_code TEXT,
  last_refreshed TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX idx_search_snapshots_user_id ON search_snapshots(user_id);
CREATE INDEX idx_search_snapshots_created_at ON search_snapshots(created_at);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_incorporation_date ON companies(incorporation_date);