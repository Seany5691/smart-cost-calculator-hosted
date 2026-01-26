# Smart Cost Calculator - VPS Hosted

A comprehensive cost calculation application for smart technology solutions, migrated from Supabase/Vercel to PostgreSQL/VPS for improved performance, maintainability, and portability.

## Features

- **Smart Calculator**: Multi-step wizard for calculating costs with role-based pricing
- **Smart Scraper**: Web scraping for Google Maps business data extraction
- **Lead Management**: CRM system with status tracking, notes, reminders, and route generation
- **Admin Console**: Centralized management for pricing, configurations, and users
- **Unified Dashboard**: Aggregated stats and tools from all components

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 15+ with connection pooling
- **Authentication**: JWT with bcrypt password hashing
- **State Management**: Zustand with persist middleware
- **PDF Generation**: pdf-lib
- **Web Scraping**: Puppeteer with Chromium
- **Containerization**: Docker with Docker Compose

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 15+ (or use Docker)
- Docker and Docker Compose (for containerized deployment)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd hosted-smart-cost-calculator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_calculator
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Start PostgreSQL (if using Docker)

```bash
docker-compose up -d postgres
```

### 5. Run database migrations

```bash
npm run migrate
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose --profile production up -d
```

This will start:
- PostgreSQL database
- Next.js application
- Nginx reverse proxy (production only)

## Database Migrations

### Run all pending migrations

```bash
npm run migrate
```

### Rollback the last migration

```bash
npm run migrate:rollback
```

### Create a new migration

Create a new SQL file in `database/migrations/` with the naming convention:
`XXX_migration_name.sql`

Example: `002_add_user_preferences.sql`

## Project Structure

```
hosted-smart-cost-calculator/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utility functions and services
│   ├── db.ts             # Database connection and queries
│   ├── migrations.ts     # Migration runner
│   └── config.ts         # Application configuration
├── database/              # Database schemas and migrations
│   ├── schema.sql        # Complete database schema
│   └── migrations/       # Migration files
├── scripts/               # Utility scripts
│   ├── migrate.js        # Migration runner script
│   └── rollback.js       # Rollback script
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile            # Docker image definition
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `PORT` | Application port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `STORAGE_TYPE` | File storage type (local/s3) | local |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info |

## Resource Optimization

The application is optimized to run within 512MB RAM per container:

- Connection pooling (min: 2, max: 10 connections)
- Caching with TTL (5 minutes for configs, 1 minute for stats)
- Code splitting and tree shaking
- Image optimization (WebP format)
- Gzip compression
- Lazy loading for heavy components

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 24-hour expiration
- Prepared statements for SQL queries
- Role-based access control
- Super admin protection (Camryn user cannot be deleted/modified)
- HTTPS/SSL support via Nginx

## Maintenance

### Database Backups

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres smart_calculator > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres smart_calculator < backup.sql
```

### Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
