# PostgreSQL Deployment Guide

This guide will help you deploy the Smart Cost Calculator with PostgreSQL on your VPS.

## 🚀 Quick Start

### Prerequisites
- Ubuntu/Debian VPS with root access
- Node.js 18+ installed
- PostgreSQL installed
- Domain name (optional but recommended)

### Step 1: Install PostgreSQL

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE smartcost_vps;

# Create user with password
CREATE USER smartcost_user WITH PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE smartcost_vps TO smartcost_user;

# Exit psql
\q
```

### Step 3: Setup Database Schema

```bash
# Copy the schema file to your VPS
scp database/schema.sql user@your-vps:/tmp/

# Import the schema
psql -h localhost -U smartcost_user -d smartcost_vps -f /tmp/schema.sql
```

### Step 4: Configure Environment

Copy the PostgreSQL environment file:
```bash
cp .env.postgresql .env.local
```

Edit `.env.local` with your actual database password:
```env
POSTGRES_PASSWORD=your_actual_secure_password_here
```

### Step 5: Install Dependencies

```bash
# Install dependencies
npm install

# Build the application
npm run build
```

### Step 6: Test Database Connection

```bash
# Test PostgreSQL connection
npm run test-db
```

### Step 7: Start the Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

### Step 8: Configure Nginx (Optional but Recommended)

```bash
# Copy nginx config
sudo cp nginx/smartcost.conf /etc/nginx/sites-available/

# Enable site
sudo ln -s /etc/nginx/sites-available/smartcost.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 9: Setup SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Step 10: Setup Backups

```bash
# Make backup script executable
chmod +x scripts/backup-postgres.sh

# Test backup
./scripts/backup-postgres.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/your/project/scripts/backup-postgres.sh") | crontab -
```

## 📋 Manual Steps Required

### 1. Install PostgreSQL on your VPS
You'll need to SSH into your VPS and run the PostgreSQL installation commands.

### 2. Create Database and User
Run the SQL commands in Step 2 to create the database and user.

### 3. Update Environment Variables
Edit `.env.local` with your actual database credentials.

### 4. Install Dependencies
Run `npm install` on your VPS to install all required packages.

### 5. Test Database Connection
Run `npm run test-db` to verify PostgreSQL connectivity.

### 6. Deploy Application
Use PM2 to start the application in production mode.

## 🔧 Troubleshooting

### Database Connection Issues
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env.local`
- Test connection manually: `psql -h localhost -U smartcost_user -d smartcost_vps`

### Application Not Starting
- Check PM2 logs: `pm2 logs smartcost-calculator`
- Verify build completed: `npm run build`
- Check port availability: `sudo netstat -tlnp | grep :3000`

### Nginx Issues
- Test configuration: `sudo nginx -t`
- Check nginx logs: `sudo journalctl -u nginx`
- Reload nginx after changes: `sudo systemctl reload nginx`

## 📊 Monitoring

### PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs smartcost-calculator

# Monitor resource usage
pm2 monit
```

### Database Monitoring
```bash
# Check database size
psql -h localhost -U smartcost_user -d smartcost_vps -c "SELECT pg_size('smartcost_vps');"

# Check active connections
psql -h localhost -U smartcost_user -d smartcost_vps -c "SELECT count(*) FROM pg_stat_activity;"

# View slow queries
psql -h localhost -U smartcost_user -d smartcost_vps -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## 🔐 Security Recommendations

1. **Use strong passwords** for your database user
2. **Enable SSL** on your domain
3. **Regular backups** are automated via cron
4. **Keep software updated** on your VPS
5. **Use firewall** to restrict access to necessary ports
6. **Monitor logs** for suspicious activity

## 📞 Support

If you encounter any issues during deployment:

1. Check the application logs
2. Verify database connectivity
3. Ensure all environment variables are set correctly
4. Check that all required services are running

For additional help, refer to the troubleshooting section above or check the application logs for specific error messages.
