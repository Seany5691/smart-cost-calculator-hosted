-- PostgreSQL Database Schema for Smart Cost Calculator VPS Version
-- This script creates all necessary tables and indexes for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    requires_password_change BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HARDWARE, CONNECTIVITY & LICENSING ITEMS
-- =====================================================

-- Hardware items
CREATE TABLE IF NOT EXISTS hardware_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    manager_cost NUMERIC(10,2),
    user_cost NUMERIC(10,2),
    quantity INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT false,
    is_extension BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_order INTEGER DEFAULT 0
);

-- Connectivity items
CREATE TABLE IF NOT EXISTS connectivity_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    manager_cost NUMERIC(10,2),
    user_cost NUMERIC(10,2),
    quantity INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_order INTEGER DEFAULT 0
);

-- Licensing items
CREATE TABLE IF NOT EXISTS licensing_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    manager_cost NUMERIC(10,2),
    user_cost NUMERIC(10,2),
    quantity INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_order INTEGER DEFAULT 0
);

-- =====================================================
-- CONFIGURATION DATA
-- =====================================================

-- Factors configuration
CREATE TABLE IF NOT EXISTS factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factors_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scales configuration
CREATE TABLE IF NOT EXISTS scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scales_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LEAD MANAGEMENT
-- =====================================================

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maps_address TEXT,
    number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    provider VARCHAR(100),
    address TEXT,
    town VARCHAR(100),
    contact_person VARCHAR(255),
    type_of_business VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    date_to_call_back TIMESTAMP WITH TIME ZONE,
    date_signed TIMESTAMP WITH TIME ZONE,
    coordinates JSONB,
    background_color VARCHAR(20),
    list_name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    route_url TEXT,
    stop_count INTEGER DEFAULT 0,
    lead_ids JSONB DEFAULT '[]',
    starting_point JSONB,
    notes TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead notes
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead interactions
CREATE TABLE IF NOT EXISTS lead_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead reminders
CREATE TABLE IF NOT EXISTS lead_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    message TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DEAL CALCULATIONS
-- =====================================================

-- Deal calculations
CREATE TABLE IF NOT EXISTS deal_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255),
    user_role VARCHAR(50),
    deal_name VARCHAR(255),
    customer_name VARCHAR(255),
    deal_details JSONB NOT NULL,
    sections_data JSONB NOT NULL,
    totals_data JSONB NOT NULL,
    factors_data JSONB NOT NULL,
    scales_data JSONB NOT NULL,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    deal_id UUID,
    deal_name VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SCRAPER DATA
-- =====================================================

-- Scraper sessions
CREATE TABLE IF NOT EXISTS scraper_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Scraper results
CREATE TABLE IF NOT EXISTS scraper_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL REFERENCES scraper_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50),
    provider VARCHAR(100),
    address TEXT,
    town VARCHAR(100),
    contact_person VARCHAR(255),
    type_of_business VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    coordinates JSONB,
    background_color VARCHAR(20),
    list_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Hardware items indexes
CREATE INDEX IF NOT EXISTS idx_hardware_active ON hardware_items(is_active);
CREATE INDEX IF NOT EXISTS idx_hardware_name ON hardware_items(name);

-- Connectivity items indexes
CREATE INDEX IF NOT EXISTS idx_connectivity_active ON connectivity_items(is_active);
CREATE INDEX IF NOT EXISTS idx_connectivity_name ON connectivity_items(name);

-- Licensing items indexes
CREATE INDEX IF NOT EXISTS idx_licensing_active ON licensing_items(is_active);
CREATE INDEX IF NOT EXISTS idx_licensing_name ON licensing_items(name);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_number ON leads(number);
CREATE INDEX IF NOT EXISTS idx_leads_provider ON leads(provider);
CREATE INDEX IF NOT EXISTS idx_leads_list_name ON leads(list_name);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at);

-- Lead notes indexes
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_user_id ON lead_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at);

-- Lead interactions indexes
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_user_id ON lead_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON lead_interactions(created_at);

-- Lead reminders indexes
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead_id ON lead_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_user_id ON lead_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_date ON lead_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_completed ON lead_reminders(is_completed);

-- Deal calculations indexes
CREATE INDEX IF NOT EXISTS idx_deal_calculations_user_id ON deal_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_calculations_created_at ON deal_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_deal_calculations_updated_at ON deal_calculations(updated_at);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);

-- Scraper sessions indexes
CREATE INDEX IF NOT EXISTS idx_scraper_sessions_user_id ON scraper_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_sessions_status ON scraper_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scraper_sessions_started_at ON scraper_sessions(started_at);

-- Scraper results indexes
CREATE INDEX IF NOT EXISTS idx_scraper_results_session_id ON scraper_results(session_id);
CREATE INDEX IF NOT EXISTS idx_scraper_results_created_at ON scraper_results(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hardware_items_updated_at BEFORE UPDATE ON hardware_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connectivity_items_updated_at BEFORE UPDATE ON connectivity_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licensing_items_updated_at BEFORE UPDATE ON licensing_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factors_updated_at BEFORE UPDATE ON factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scales_updated_at BEFORE UPDATE ON scales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at BEFORE UPDATE ON lead_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_reminders_updated_at BEFORE UPDATE ON lead_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_calculations_updated_at BEFORE UPDATE ON deal_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraper_results_updated_at BEFORE UPDATE ON scraper_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default admin user
INSERT INTO users (id, username, password, role, name, email, is_active, requires_password_change)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Camryn',
    'Elliot6242!',
    'admin',
    'Camryn Admin',
    'camryn@company.com',
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Insert sample users
INSERT INTO users (id, username, password, role, name, email, is_active, requires_password_change)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'john', 'password123', 'manager', 'John Manager', 'john@company.com', true, false),
    ('550e8400-e29b-41d4-a716-446655440002', 'jane', 'password123', 'user', 'Jane User', 'jane@company.com', true, false)
ON CONFLICT (id) DO NOTHING;

-- Insert default factors
INSERT INTO factors (factors_data)
VALUES ('{"installation": {"base_cost": 3500, "per_point_cost": 750}, "connectivity": {"base_cost": 1800, "per_km_cost": 1.5}}')
ON CONFLICT DO NOTHING;

-- Insert default scales
INSERT INTO scales (scales_data)
VALUES ('{"installation": {"0-4": 3500, "5-8": 3500, "9-16": 7000, "17-32": 10500, "33+": 15000}, "finance_fee": {"0-20000": 1800, "20001-50000": 1800, "50001-100000": 2800, "100001+": 3800}, "gross_profit": {"0-4": 10000, "5-8": 15000, "9-16": 20000, "17-32": 25000, "33+": 30000}, "additional_costs": {"cost_per_kilometer": 1.5, "cost_per_point": 750}}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Smart Cost Calculator PostgreSQL schema created successfully!';
    RAISE NOTICE 'Tables created: users, hardware_items, connectivity_items, licensing_items, factors, scales, leads, routes, lead_notes, lead_interactions, lead_reminders, deal_calculations, activity_logs, scraper_sessions, scraper_results';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Triggers created for automatic updated_at timestamps';
    RAISE NOTICE 'Default users and configuration data inserted';
END $$;
