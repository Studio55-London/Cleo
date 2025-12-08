-- Cleo AI Agent Workspace - PostgreSQL Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search optimization

-- Grant privileges (useful for Azure PostgreSQL)
GRANT ALL PRIVILEGES ON DATABASE cleo TO cleoagent;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Cleo database initialized with pgvector extension';
END $$;
