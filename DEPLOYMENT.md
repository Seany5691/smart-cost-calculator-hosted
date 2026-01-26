# Deployment Guide

This guide covers deploying the Smart Cost Calculator to a VPS using Docker.

## Prerequisites

- VPS with Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name (optional, for SSL)
- At least 2GB RAM and 20GB disk space

## Installation Steps

### 1. Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone the Repository

```bash
git clone <repository-url>
cd hosted-smart-cost-calculator
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Update the following variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong random secret (use `openssl rand -base64 32`)
- `POSTGRES_PASSWORD`: Strong database password
- Other configuration as needed

### 4. Build and Start Services

```bash
# Build the Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 5. Run Database Migrations

```bash
docker-compose exec app npm run migrate
```

### 6. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"healthy","database":"connected","timestamp":"..."}
```

## SSL/HTTPS Setup (Production)

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certificates will be automatically renewed
```

### Manual SSL Configuration

1. Place your SSL certificates in `nginx/ssl/`:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Uncomment the HTTPS server block in `nginx/nginx.conf`

3. Restart Nginx:
   ```bash
   docker-compose restart nginx
   ```

## Production Deployment

### 1. Start with Production Profile

```bash
docker-compose --profile production up -d
```

This starts:
- PostgreSQL database
- Next.js application
- Nginx reverse proxy

### 2. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 3. Set Up Automatic Backups

Create a backup script (`backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
docker-compose exec -T postgres pg_dump -U postgres smart_calculator | gzip > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make it executable and add to cron:

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /path/to/backup.sh
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Monitor Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Database health
docker-compose exec postgres pg_isready -U postgres
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec app npm run migrate
```

### Database Maintenance

```bash
# Vacuum database
docker-compose exec postgres psql -U postgres -d smart_calculator -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U postgres -d smart_calculator -c "SELECT pg_size_pretty(pg_database_size('smart_calculator'));"
```

### Clean Up Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Troubleshooting

### Application Won't Start

1. Check logs:
   ```bash
   docker-compose logs app
   ```

2. Verify environment variables:
   ```bash
   docker-compose exec app env | grep DATABASE_URL
   ```

3. Check database connection:
   ```bash
   docker-compose exec postgres psql -U postgres -d smart_calculator -c "SELECT 1;"
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Test connection from app container:
   ```bash
   docker-compose exec app node -e "require('./lib/db').healthCheck().then(console.log)"
   ```

### High Memory Usage

1. Check container memory:
   ```bash
   docker stats
   ```

2. Adjust memory limits in `docker-compose.yml`

3. Restart services:
   ```bash
   docker-compose restart
   ```

### Nginx Issues

1. Test Nginx configuration:
   ```bash
   docker-compose exec nginx nginx -t
   ```

2. Reload Nginx:
   ```bash
   docker-compose exec nginx nginx -s reload
   ```

## Rollback Procedure

If deployment fails:

1. Stop services:
   ```bash
   docker-compose down
   ```

2. Restore from backup:
   ```bash
   gunzip < /backups/backup_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T postgres psql -U postgres smart_calculator
   ```

3. Checkout previous version:
   ```bash
   git checkout <previous-commit>
   ```

4. Rebuild and start:
   ```bash
   docker-compose up -d --build
   ```

## Security Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable firewall
- [ ] Configure SSL/HTTPS
- [ ] Set up automatic backups
- [ ] Enable fail2ban for SSH protection
- [ ] Keep Docker and system packages updated
- [ ] Monitor logs for suspicious activity
- [ ] Restrict database access to localhost
- [ ] Use environment variables for secrets (never commit to git)

## Performance Optimization

1. **Database Indexing**: Ensure all indexes are created (run migrations)
2. **Connection Pooling**: Already configured (min: 2, max: 10)
3. **Caching**: Application-level caching enabled with TTL
4. **Compression**: Gzip enabled in Nginx
5. **Static Assets**: Cached with long max-age headers

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation: `README.md`
- Contact development team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
