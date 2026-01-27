#!/bin/bash

# Scraper Enhancement Migrations
# Run this script to apply Phase 3 and Phase 4 database migrations

echo "🚀 Running Scraper Enhancement Migrations..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running migrations"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Migration 015: Provider Lookup Cache
echo "📦 Running Migration 015: Provider Lookup Cache..."
psql "$DATABASE_URL" -f database/migrations/015_add_provider_cache.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 015 completed successfully"
else
    echo "❌ Migration 015 failed"
    exit 1
fi

echo ""

# Migration 016: Scraping Templates
echo "📦 Running Migration 016: Scraping Templates..."
psql "$DATABASE_URL" -f database/migrations/016_add_scraping_templates.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 016 completed successfully"
else
    echo "❌ Migration 016 failed"
    exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""

# Verify tables were created
echo "🔍 Verifying tables..."
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('provider_lookup_cache', 'scraping_templates');"

echo ""
echo "✅ Migration script complete!"
