-- PostgreSQL Schema for Smart Cost Calculator
-- Run this script to create all necessary tables

-- Connect to your database first:
-- \c smartcost_vps

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    user_role VARCHAR(50),
    customer_name VARCHAR(255),
    deal_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    phone VARCHAR(50),
    provider VARCHAR(255),
    address TEXT,
    type_of_business VARCHAR(255),
    town VARCHAR(255),
    notes TEXT,
    date_to_call_back TIMESTAMP,
    coordinates JSONB,
    background_color VARCHAR(20),
    list_name VARCHAR(255),
    import_session_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    route_url TEXT,
    stop_count INTEGER DEFAULT 0,
    lead_ids JSONB,
    starting_point JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scraped_businesses table
CREATE TABLE IF NOT EXISTS scraped_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    maps_address TEXT NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    provider VARCHAR(255),
    address TEXT,
    type_of_business VARCHAR(255),
    town VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scraping_sessions table
CREATE TABLE IF NOT EXISTS scraping_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    progress JSONB DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    user_role VARCHAR(50),
    activity_type VARCHAR(100) NOT NULL,
    deal_id UUID,
    deal_name VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_town ON leads(town);
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_scraped_businesses_session_id ON scraped_businesses(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_businesses_updated_at BEFORE UPDATE ON scraped_businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_sessions_updated_at BEFORE UPDATE ON scraping_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO leads (user_id, username, user_role, customer_name, status, town) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin', 'Sample Customer', 'new', 'Sample Town')
ON CONFLICT DO NOTHING;
