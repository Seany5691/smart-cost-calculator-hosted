# Architecture Diagram - Smart Cost Calculator

## Current Architecture (Vercel)

```
┌─────────────────────────────────────────────────────────────────┐
│                           INTERNET                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Vercel Edge   │
                    │   Network      │
                    └────────┬───────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │      Vercel Serverless Functions       │
        │  ┌──────────────────────────────────┐  │
        │  │  Next.js API Routes              │  │
        │  │  - /api/scrape/*                 │  │
        │  │  - /api/config/*                 │  │
        │  │  - /api/leads/*                  │  │
        │  │  - /api/users/*                  │  │
        │  └──────────────┬───────────────────┘  │
        │                 │                       │
        │                 ▼                       │
        │  ┌──────────────────────────────────┐  │
        │  │  @sparticuz/chromium             │  │
        │  │  (Serverless-optimized)          │  │
        │  │  - Limited memory                │  │
        │  │  - 10-second timeout             │  │
        │  │  - Cold starts                   │  │
        │  └──────────────────────────────────┘  │
        └────────────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Supabase Cloud     │
              │  ┌────────────────┐  │
              │  │  PostgreSQL    │  │
              │  │  - Users       │  │
              │  │  - Deals       │  │
              │  │  - Config      │  │
              │  │  - Scraper     │  │
              │  └────────────────┘  │
              └──────────────────────┘
```

---

## New Architecture (Self-Hosted with Dockploy)

```
┌─────────────────────────────────────────────────────────────────┐
│                           INTERNET                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Domain + SSL  │
                    │  (Let's Encrypt)│
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Nginx/Caddy   │
                    │  Reverse Proxy │
                    └────────┬───────┘
                             │
                             ▼
        ┌────────────────────────────────────────────────┐
        │         Your VPS (Ubuntu 22.04)                │
        │                                                 │
        │  ┌──────────────────────────────────────────┐  │
        │  │         Dockploy Manager                 │  │
        │  │  - Container orchestration               │  │
        │  │  - Auto-deployment from Git              │  │
        │  │  - SSL management                        │  │
        │  │  - Resource monitoring                   │  │
        │  └──────────────┬───────────────────────────┘  │
        │                 │                               │
        │                 ▼                               │
        │  ┌──────────────────────────────────────────┐  │
        │  │    Docker Container                      │  │
        │  │    (smart-cost-calculator)               │  │
        │  │                                          │  │
        │  │  ┌────────────────────────────────────┐ │  │
        │  │  │  Next.js Application               │ │  │
        │  │  │  - Standalone build                │ │  │
        │  │  │  - API routes                      │ │  │
        │  │  │  - React frontend                  │ │  │
        │  │  │  - Server-side rendering           │ │  │
        │  │  └────────────┬───────────────────────┘ │  │
        │  │               │                          │  │
        │  │               ▼                          │  │
        │  │  ┌────────────────────────────────────┐ │  │
        │  │  │  Puppeteer + System Chromium       │ │  │
        │  │  │  - Full browser instances          │ │  │
        │  │  │  - No timeout limits               │ │  │
        │  │  │  - Full VPS resources              │ │  │
        │  │  │  - Concurrent scraping             │ │  │
        │  │  └────────────────────────────────────┘ │  │
        │  │                                          │  │
        │  │  Resources:                              │  │
        │  │  - CPU: 2-4 vCPUs                        │  │
        │  │  - RAM: 2-4 GB                           │  │
        │  │  - Storage: 20-40 GB                     │  │
        │  └──────────────┬───────────────────────────┘  │
        │                 │                               │
        └─────────────────┼───────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   Supabase Cloud     │
              │  ┌────────────────┐  │
              │  │  PostgreSQL    │  │
              │  │  - Users       │  │
              │  │  - Deals       │  │
              │  │  - Config      │  │
              │  │  - Scraper     │  │
              │  └────────────────┘  │
              └──────────────────────┘
```

---

## Component Breakdown

### 1. User Layer
```
┌──────────────────────────────────────┐
│           End Users                  │
│  - Web browsers                      │
│  - Mobile devices                    │
│  - Desktop computers                 │
└──────────────────────────────────────┘
```

### 2. Network Layer
```
┌──────────────────────────────────────┐
│         SSL/TLS (HTTPS)              │
│  - Let's Encrypt certificate         │
│  - Auto-renewal                      │
│  - 256-bit encryption                │
└──────────────────────────────────────┘
         ▼
┌──────────────────────────────────────┐
│      Reverse Proxy (Nginx)           │
│  - Request routing                   │
│  - Load balancing                    │
│  - Static file serving               │
└──────────────────────────────────────┘
```

### 3. Application Layer
```
┌──────────────────────────────────────────────────┐
│         Docker Container                         │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Next.js Server (Node.js 20)              │ │
│  │                                            │ │
│  │  Frontend:                                 │ │
│  │  - React 19 components                     │ │
│  │  - Tailwind CSS styling                    │ │
│  │  - Client-side routing                     │ │
│  │                                            │ │
│  │  Backend:                                  │ │
│  │  - API routes                              │ │
│  │  - Server-side rendering                   │ │
│  │  - Authentication middleware               │ │
│  │                                            │ │
│  │  State Management:                         │ │
│  │  - Zustand stores                          │ │
│  │  - Local storage                           │ │
│  │  - Session management                      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Scraping Engine                           │ │
│  │                                            │ │
│  │  - Puppeteer Core                          │ │
│  │  - System Chromium                         │ │
│  │  - Concurrent browser instances            │ │
│  │  - Provider lookup service                 │ │
│  │  - Session management                      │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 4. Data Layer
```
┌──────────────────────────────────────┐
│      Supabase (PostgreSQL)           │
│                                      │
│  Tables:                             │
│  ┌────────────────────────────────┐ │
│  │ users                          │ │
│  │ - Authentication               │ │
│  │ - Role-based access            │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ deal_calculations              │ │
│  │ - Saved deals                  │ │
│  │ - Cost breakdowns              │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ hardware/connectivity/licensing│ │
│  │ - Configuration items          │ │
│  │ - Pricing data                 │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ scraper_sessions               │ │
│  │ - Scraping jobs                │ │
│  │ - Progress tracking            │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ scraper_businesses             │ │
│  │ - Scraped data                 │ │
│  │ - Business information         │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. User Authentication Flow
```
User Browser
    │
    │ 1. POST /api/users (login)
    ▼
Next.js API
    │
    │ 2. Query users table
    ▼
Supabase
    │
    │ 3. Return user data
    ▼
Next.js API
    │
    │ 4. Create session
    │ 5. Return JWT token
    ▼
User Browser
    │
    │ 6. Store in localStorage
    │ 7. Redirect to dashboard
    ▼
Dashboard
```

### 2. Calculator Flow
```
User Input
    │
    │ 1. Enter deal details
    ▼
Calculator Store (Zustand)
    │
    │ 2. Calculate costs
    │ 3. Apply role-based pricing
    ▼
Display Results
    │
    │ 4. User clicks "Save Deal"
    ▼
POST /api/deals
    │
    │ 5. Save to database
    ▼
Supabase
    │
    │ 6. Return deal ID
    ▼
Success Message
```

### 3. Scraping Flow
```
User Input
    │
    │ 1. Enter towns & industries
    ▼
POST /api/scrape/start
    │
    │ 2. Create session in Supabase
    ▼
Supabase (scraper_sessions)
    │
    │ 3. Return session ID
    ▼
Client Polling Loop
    │
    │ 4. POST /api/scrape/process
    ▼
Puppeteer + Chromium
    │
    │ 5. Launch browser
    │ 6. Navigate to search page
    │ 7. Extract business data
    │ 8. Lookup providers
    ▼
Supabase (scraper_businesses)
    │
    │ 9. Save results
    ▼
Client Polling
    │
    │ 10. GET /api/scrape/status
    │ 11. Update UI
    ▼
Display Results
```

---

## Resource Allocation

### VPS Resource Distribution
```
┌─────────────────────────────────────────────┐
│         VPS (4 vCPU, 4 GB RAM)              │
│                                             │
│  System Overhead: 500 MB                    │
│  ├─ OS: 300 MB                              │
│  └─ Docker: 200 MB                          │
│                                             │
│  Docker Container: 3.5 GB                   │
│  ├─ Next.js App: 300 MB                     │
│  ├─ Node.js Runtime: 200 MB                 │
│  ├─ Chromium (idle): 200 MB                 │
│  └─ Available for scraping: 2.8 GB          │
│                                             │
│  During Active Scraping:                    │
│  ├─ 3 Chromium instances: 1.2 GB            │
│  ├─ Processing overhead: 600 MB             │
│  └─ Buffer: 1 GB                            │
└─────────────────────────────────────────────┘
```

### CPU Allocation
```
┌─────────────────────────────────────────────┐
│         CPU Usage (4 vCPUs)                 │
│                                             │
│  Idle State:                                │
│  ├─ Next.js: 5-10%                          │
│  ├─ System: 5%                              │
│  └─ Available: 85-90%                       │
│                                             │
│  During Scraping:                           │
│  ├─ Chromium instances: 60-80%              │
│  ├─ Next.js processing: 10-15%              │
│  ├─ System: 5-10%                           │
│  └─ Buffer: 5-15%                           │
└─────────────────────────────────────────────┘
```

---

## Network Flow

### Request Path
```
Internet
    │
    │ HTTPS (443)
    ▼
Firewall (UFW)
    │
    │ Allow 443
    ▼
Nginx/Caddy
    │
    │ Reverse proxy
    ▼
Docker Network Bridge
    │
    │ Port 3000
    ▼
Next.js Container
    │
    │ Process request
    ▼
Response
```

### Database Connection
```
Next.js Container
    │
    │ Supabase Client
    │ (REST API)
    ▼
Internet
    │
    │ HTTPS
    ▼
Supabase Cloud
    │
    │ PostgreSQL
    ▼
Query Result
```

---

## Deployment Pipeline

### Git-Based Deployment
```
Developer
    │
    │ 1. git push
    ▼
GitHub/GitLab
    │
    │ 2. Webhook
    ▼
Dockploy
    │
    │ 3. Pull code
    │ 4. Build Docker image
    ▼
Docker Build
    │
    │ 5. Multi-stage build
    │    - Install dependencies
    │    - Build Next.js
    │    - Install Chromium
    ▼
Docker Image
    │
    │ 6. Stop old container
    │ 7. Start new container
    ▼
Running Application
    │
    │ 8. Health check
    ▼
Deployment Complete
```

---

## Scaling Options

### Vertical Scaling (Single Server)
```
Current: 4 vCPU, 4 GB RAM
    │
    │ Upgrade
    ▼
Upgraded: 8 vCPU, 8 GB RAM
    │
    │ Benefits:
    │ - More concurrent scraping
    │ - Better performance
    │ - Higher capacity
    ▼
Better Performance
```

### Horizontal Scaling (Multiple Servers)
```
Load Balancer
    │
    ├─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
Server 1  Server 2  Server 3  Server 4
    │         │         │         │
    └─────────┴─────────┴─────────┘
                  │
                  ▼
            Supabase
         (Shared Database)
```

---

## Monitoring Architecture

### Monitoring Stack
```
┌─────────────────────────────────────────┐
│         Application Metrics             │
│  - Request count                        │
│  - Response times                       │
│  - Error rates                          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Container Metrics               │
│  - CPU usage                            │
│  - Memory usage                         │
│  - Disk I/O                             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         System Metrics                  │
│  - VPS resources                        │
│  - Network traffic                      │
│  - Disk space                           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Monitoring Dashboard               │
│  - Grafana / Netdata                    │
│  - Real-time graphs                     │
│  - Alerts                               │
└─────────────────────────────────────────┘
```

---

## Security Layers

### Security Architecture
```
┌─────────────────────────────────────────┐
│         Layer 1: Network                │
│  - Firewall (UFW)                       │
│  - Fail2ban                             │
│  - DDoS protection (Cloudflare)         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Layer 2: Transport              │
│  - SSL/TLS encryption                   │
│  - HTTPS only                           │
│  - Certificate auto-renewal             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Layer 3: Application            │
│  - Authentication (JWT)                 │
│  - Role-based access control            │
│  - Input validation                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Layer 4: Database               │
│  - Row Level Security (RLS)             │
│  - Encrypted connections                │
│  - API key management                   │
└─────────────────────────────────────────┘
```

---

## Backup Strategy

### Backup Architecture
```
┌─────────────────────────────────────────┐
│         Application Data                │
│  - Environment variables                │
│  - Docker volumes                       │
│  - Configuration files                  │
└────────────────┬────────────────────────┘
                 │
                 │ Daily backup (cron)
                 ▼
┌─────────────────────────────────────────┐
│         Backup Storage                  │
│  - Local: /backups                      │
│  - Remote: S3/Backblaze                 │
│  - Retention: 7 days                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Database (Supabase)             │
│  - Automatic daily backups              │
│  - Point-in-time recovery               │
│  - 7-day retention (Pro plan)           │
└─────────────────────────────────────────┘
```

---

## Comparison: Vercel vs Self-Hosted

### Vercel Architecture
```
Pros:
✅ Zero configuration
✅ Auto-scaling
✅ Global CDN
✅ Easy deployment

Cons:
❌ Serverless timeouts (10s)
❌ Limited memory
❌ Cold starts
❌ Expensive at scale
```

### Self-Hosted Architecture
```
Pros:
✅ No timeout limits
✅ Full resource control
✅ Better scraping performance
✅ Predictable costs
✅ Full customization

Cons:
❌ Manual server management
❌ You handle updates
❌ You configure backups
❌ Single region (unless multi-server)
```

---

## Summary

### Key Components
1. **VPS Server** - Ubuntu 22.04 with Docker
2. **Dockploy** - Container orchestration
3. **Docker Container** - Next.js + Chromium
4. **Supabase** - PostgreSQL database
5. **Nginx/Caddy** - Reverse proxy
6. **Let's Encrypt** - SSL certificates

### Resource Requirements
- **CPU**: 2-4 vCPUs
- **RAM**: 2-4 GB
- **Storage**: 20-40 GB SSD
- **Bandwidth**: 1-2 TB/month

### Performance
- **Response Time**: < 200ms (API)
- **Scraping Speed**: 50-100 businesses/minute
- **Concurrent Users**: 10-50
- **Uptime**: 99.9% (with monitoring)

---

*This architecture provides a robust, scalable foundation for the Smart Cost Calculator with excellent scraping performance.*
