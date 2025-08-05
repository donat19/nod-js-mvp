# AutoMax Deployment Guide

## Overview

This guide covers deploying the AutoMax car marketplace platform to production environments, including server setup, database configuration, security considerations, and monitoring.

## Production Requirements

### Minimum System Requirements
- **CPU**: 2 vCPUs
- **Memory**: 4GB RAM
- **Storage**: 50GB SSD
- **Bandwidth**: 100Mbps
- **OS**: Ubuntu 20.04 LTS or later

### Recommended Production Setup
- **CPU**: 4+ vCPUs
- **Memory**: 8GB+ RAM
- **Storage**: 100GB+ SSD with backup
- **Database**: Separate PostgreSQL server
- **CDN**: For static assets and file uploads
- **Load Balancer**: For high availability

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Ubuntu server with SSH access
- [ ] Domain name configured
- [ ] SSL certificate obtained
- [ ] Firewall configured
- [ ] Backup strategy in place

### 2. Database Setup
- [ ] PostgreSQL server installed and secured
- [ ] Database created with proper user permissions
- [ ] Connection pooling configured
- [ ] Backup automation setup
- [ ] SSL connections enabled

### 3. Application Dependencies
- [ ] Node.js 18+ installed
- [ ] PM2 process manager
- [ ] Nginx reverse proxy
- [ ] Git for deployment
- [ ] ImageMagick for image processing

## Server Setup

### 1. Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install PM2 Process Manager
```bash
npm install -g pm2

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 3. Install and Configure Nginx
```bash
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/automax
```

#### Nginx Configuration (`/etc/nginx/sites-available/automax`)
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File Upload Limit
    client_max_body_size 20M;

    # Static Files
    location /public {
        alias /var/www/automax/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API and WebSocket
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket Chat
    location /ws/chat {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

#### Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/automax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib

# Secure PostgreSQL
sudo -u postgres psql
\password postgres
CREATE DATABASE automax_production;
CREATE USER automax_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE automax_production TO automax_user;
\q
```

#### PostgreSQL Security Configuration
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add/modify these settings:
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
log_connections = on
log_disconnections = on
log_statement = 'all'

# Configure client authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add SSL requirement for remote connections
hostssl all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

## Application Deployment

### 1. Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/yourusername/automax.git
sudo chown -R $USER:$USER /var/www/automax
cd automax
```

### 2. Install Dependencies
```bash
npm ci --production
```

### 3. Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

#### Production Environment Variables
```env
# Server Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your_super_secure_jwt_secret_here

# Database (Use connection string for production)
DATABASE_URL=postgresql://automax_user:secure_password@localhost:5432/automax_production

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_VERIFY_SERVICE_SID=your_production_verify_service_sid
TWILIO_PHONE_NUMBER=your_production_phone_number

# Session Security
SESSION_SECRET=your_super_secure_session_secret_here

# Logging
LOG_LEVEL=info

# File Upload
UPLOAD_PATH=/var/www/automax/public/uploads
MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Migration
```bash
# Run database migrations
npm run db:setup
```

### 5. Build Application (if applicable)
```bash
# If you have a build step
npm run build
```

### 6. Start with PM2
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

#### PM2 Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'automax',
      script: 'server.js',
      env_file: '.env.production',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Restart settings
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Performance
      node_args: '--max_old_space_size=2048'
    }
  ]
};
```

#### Start Application
```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Monitor application
pm2 monit
```

## Security Configuration

### 1. Firewall Setup
```bash
# Install and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Application Security
```bash
# Create non-root user for application
sudo adduser --system --group automax
sudo usermod -aG www-data automax

# Set proper file permissions
sudo chown -R automax:automax /var/www/automax
sudo chmod -R 755 /var/www/automax
sudo chmod -R 644 /var/www/automax/public/uploads
```

### 4. Database Security
```bash
# Backup PostgreSQL configuration
sudo cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup

# Set up database backups
sudo nano /etc/cron.daily/automax-backup
```

#### Backup Script (`/etc/cron.daily/automax-backup`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/automax"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="automax_production"
DB_USER="automax_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/automax_db_$DATE.sql.gz

# File backup
tar -czf $BACKUP_DIR/automax_files_$DATE.tar.gz /var/www/automax/public/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Log backup completion
echo "$(date): Backup completed" >> /var/log/automax-backup.log
```

```bash
sudo chmod +x /etc/cron.daily/automax-backup
```

## Monitoring and Logging

### 1. Application Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 2. System Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop

# Install disk usage monitoring
sudo apt install ncdu

# Monitor logs
sudo apt install multitail
```

### 3. Application Health Checks
Create a health check endpoint monitoring script:

```bash
# Create health check script
sudo nano /usr/local/bin/automax-health-check.sh
```

```bash
#!/bin/bash
ENDPOINT="https://your-domain.com/api/auth/status"
LOG_FILE="/var/log/automax-health.log"

# Check API health
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed" >> $LOG_FILE
else
    echo "$(date): Health check failed - HTTP $RESPONSE" >> $LOG_FILE
    # Restart application if health check fails
    pm2 restart automax
    echo "$(date): Application restarted" >> $LOG_FILE
fi
```

```bash
sudo chmod +x /usr/local/bin/automax-health-check.sh

# Add to crontab (run every 5 minutes)
echo "*/5 * * * * /usr/local/bin/automax-health-check.sh" | sudo crontab -
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Connect to PostgreSQL and run these optimizations
\c automax_production

-- Analyze tables for optimal query plans
ANALYZE;

-- Update statistics
UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;

-- Vacuum and reindex
VACUUM ANALYZE;
REINDEX DATABASE automax_production;
```

### 2. Node.js Optimization
```bash
# Set Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable clustering in PM2 (already configured in ecosystem.config.js)
```

### 3. Nginx Optimization
Add to Nginx configuration:
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Deployment Scripts

### 1. Deployment Script
```bash
# Create deployment script
nano deploy.sh
```

```bash
#!/bin/bash
set -e

echo "Starting AutoMax deployment..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm ci --production

# Run database migrations
npm run migrate

# Restart application
pm2 restart automax

# Health check
sleep 10
curl -f https://your-domain.com/api/auth/status || (echo "Health check failed" && exit 1)

echo "Deployment completed successfully!"
```

### 2. Rollback Script
```bash
nano rollback.sh
```

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./rollback.sh <commit-hash>"
    exit 1
fi

COMMIT_HASH=$1

echo "Rolling back to commit: $COMMIT_HASH"

# Checkout specific commit
git checkout $COMMIT_HASH

# Install dependencies
npm ci --production

# Rollback database if needed
# npm run db:rollback

# Restart application
pm2 restart automax

echo "Rollback completed!"
```

## Maintenance

### 1. Regular Tasks
- **Daily**: Monitor application logs and performance
- **Weekly**: Review database performance and optimize queries
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full system backup and disaster recovery test

### 2. Update Procedure
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
npm audit
npm update

# Update PM2
npm update -g pm2
pm2 update
```

### 3. Database Maintenance
```bash
# Weekly database maintenance script
sudo nano /etc/cron.weekly/automax-db-maintenance
```

```bash
#!/bin/bash
su - postgres -c "psql automax_production -c 'VACUUM ANALYZE;'"
su - postgres -c "psql automax_production -c 'REINDEX DATABASE automax_production;'"
echo "$(date): Database maintenance completed" >> /var/log/automax-maintenance.log
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs automax

# Check system resources
htop
df -h

# Check database connection
npm run db:test
```

#### WebSocket Connections Failing
```bash
# Check Nginx configuration
sudo nginx -t

# Test WebSocket directly
wscat -c ws://localhost:3000/ws/chat

# Check firewall
sudo ufw status
```

#### High Memory Usage
```bash
# Monitor memory usage
pm2 monit

# Restart application if needed
pm2 restart automax

# Check for memory leaks in logs
tail -f logs/error.log
```

### Log Analysis
```bash
# Monitor application logs
pm2 logs automax --lines 100

# Monitor Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## Disaster Recovery

### 1. Backup Strategy
- **Database**: Daily automated backups with 30-day retention
- **Files**: Daily file backups of uploads directory
- **Configuration**: Version controlled configuration files
- **Application**: Git repository with tagged releases

### 2. Recovery Procedure
```bash
# Restore database from backup
pg_restore -h localhost -U automax_user -d automax_production /var/backups/automax/automax_db_YYYYMMDD.sql.gz

# Restore files
tar -xzf /var/backups/automax/automax_files_YYYYMMDD.tar.gz -C /

# Restart services
sudo systemctl restart postgresql
pm2 restart automax
sudo systemctl restart nginx
```

---

*This deployment guide covers production deployment for AutoMax. For development setup, refer to the main README.md file.*

*Last updated: August 2025*
