-- Initial Database Schema Migration
-- This migration creates all the base tables for the Smart Cost Calculator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  requires_password_change BOOLEAN DEFAULT false,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Hardware Items Table
CREATE TABLE IF NOT EXISTS hardware_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  manager_cost DECIMAL(10, 2) NOT NULL,
  user_cost DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  locked BOOLEAN DEFAULT false,
  is_extension BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hardware_is_active ON hardware_items(is_active);
CREATE INDEX IF NOT EXISTS idx_hardware_display_order ON hardware_items(display_order);

-- Connectivity Items Table
CREATE TABLE IF NOT EXISTS connectivity_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  manager_cost DECIMAL(10, 2) NOT NULL,
  user_cost DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  locked BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connectivity_is_active ON connectivity_items(is_active);
CREATE INDEX IF NOT EXISTS idx_connectivity_display_order ON connectivity_items(display_order);

-- Licensing Items Table
CREATE TABLE IF NOT EXISTS licensing_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  manager_cost DECIMAL(10, 2) NOT NULL,
  user_cost DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  locked BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licensing_is_active ON licensing_items(is_active);
CREATE INDEX IF NOT EXISTS idx_licensing_display_order ON licensing_items(display_order);

-- Factors Table
CREATE TABLE IF NOT EXISTS factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factors_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scales Table
CREATE TABLE IF NOT EXISTS scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scales_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deal Calculations Table
CREATE TABLE IF NOT EXISTS deal_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  deal_name VARCHAR(255) NOT NULL,
  deal_details JSONB NOT NULL,
  sections_data JSONB NOT NULL,
  totals_data JSONB NOT NULL,
  factors_data JSONB NOT NULL,
  scales_data JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deal_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deal_calculations(created_at);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER,
  maps_address TEXT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  provider VARCHAR(50),
  address TEXT,
  town VARCHAR(255),
  contact_person VARCHAR(255),
  type_of_business VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'leads', 'working', 'bad', 'later', 'signed')),
  notes TEXT,
  date_to_call_back DATE,
  date_signed DATE,
  coordinates JSONB,
  background_color VARCHAR(50),
  list_name VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_provider ON leads(provider);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_date_to_call_back ON leads(date_to_call_back);
CREATE INDEX IF NOT EXISTS idx_leads_list_name ON leads(list_name);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('call', 'email', 'meeting', 'follow_up', 'other')),
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recurrence_pattern VARCHAR(50),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_lead_id ON reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);

-- Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  route_url TEXT NOT NULL,
  stop_count INTEGER NOT NULL,
  lead_ids UUID[] NOT NULL,
  starting_point VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_lead_id ON attachments(lead_id);

-- Interactions Table (Activity Log)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);

-- Scraping Sessions Table
CREATE TABLE IF NOT EXISTS scraping_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'paused', 'stopped', 'completed')),
  progress INTEGER DEFAULT 0,
  summary JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON scraping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON scraping_sessions(status);

-- Scraped Businesses Table
CREATE TABLE IF NOT EXISTS scraped_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  maps_address TEXT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  provider VARCHAR(50),
  address TEXT,
  town VARCHAR(255),
  type_of_business VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraped_session_id ON scraped_businesses(session_id);

-- Activity Log Table (Unified)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type);
