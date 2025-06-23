# Cryptique RAG System - Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Process Management](#process-management)
7. [Monitoring Setup](#monitoring-setup)
8. [Security Configuration](#security-configuration)
9. [Backup Configuration](#backup-configuration)
10. [Health Checks](#health-checks)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 4+ cores (8+ recommended for RAG processing)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD (depends on data volume)
- **Network**: Stable internet connection with low latency to MongoDB Atlas

### Required Software
- Node.js 18.x or newer
- PM2 process manager
- MongoDB (if self-hosted) or MongoDB Atlas connection
- Redis (optional, for caching)
- Nginx (reverse proxy)
- SSL certificates (Let's Encrypt recommended)

## Server Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify installation
```

### 3. Install PM2
```bash
sudo npm install -g pm2
pm2 startup  # Follow the instructions to enable auto-start
```

### 4. Install MongoDB Tools (if needed)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-database-tools
```

### 5. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Environment Configuration

### 1. Create Production Environment File
```bash
# Navigate to project directory
cd /var/www/cryptique-backend

# Create production environment file
sudo cp config/env.example .env.production
sudo chown $USER:$USER .env.production
sudo chmod 600 .env.production
```

### 2. Configure Environment Variables
Edit `.env.production`:
```bash
# Production Environment Configuration

# Application
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cryptique_prod?retryWrites=true&w=majority

# Security
JWT_SECRET=your_super_secure_jwt_secret_32_chars_minimum
ENCRYPTION_KEY=your_encryption_key_32_characters

# API Keys
GEMINI_API=your_production_gemini_api_key
DUNE_API_KEY=your_dune_api_key

# Blockchain APIs
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISM_API_KEY=your_optimism_api_key
BSC_SCAN_API_KEY=your_bscscan_api_key
BASESCAN_API_KEY=your_basescan_api_key

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_production_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Logging
ENABLE_CONSOLE_LOGS=false

# RAG Configuration
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=200
RAG_BATCH_SIZE=10
RAG_MAX_CONCURRENT=3
RAG_MAX_RETRIES=3
RAG_RETRY_DELAY=5000

# Gemini Configuration
GEMINI_RATE_LIMIT=60
GEMINI_RATE_WINDOW=60000
GEMINI_MAX_RETRIES=3

# Monitoring
MONITOR_REFRESH_INTERVAL=5000
MONITOR_RETENTION_PERIOD=604800000

# Alert Thresholds
ALERT_ERROR_RATE=0.1
ALERT_RESPONSE_TIME=5000
ALERT_QUEUE_LENGTH=100
ALERT_MEMORY_USAGE=0.8

# Backup Configuration
BACKUP_RETENTION_DAYS=7
AWS_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Webhook Alerts (optional)
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

### 3. Set File Permissions
```bash
sudo chmod 600 .env.production
sudo chown $USER:$USER .env.production
```

## Database Setup

### 1. MongoDB Atlas Configuration
1. Create MongoDB Atlas cluster
2. Configure network access (whitelist server IP)
3. Create database user with appropriate permissions
4. Get connection string

### 2. Database Indexes
Run the index creation script:
```bash
node scripts/create-indexes.js
```

### 3. Verify Database Connection
```bash
node -e "
require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ Database connected'); process.exit(0); })
  .catch(err => { console.error('❌ Database connection failed:', err); process.exit(1); });
"
```

## Application Deployment

### 1. Clone Repository
```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/your-username/cryptique.git cryptique-backend
cd cryptique-backend
sudo chown -R $USER:$USER .
```

### 2. Install Dependencies
```bash
npm ci --production
```

### 3. Install Production Dependencies
```bash
npm install winston winston-daily-rotate-file pm2 node-fetch
```

### 4. Create Required Directories
```bash
mkdir -p logs backups/mongodb backups/vectors backups/logs backups/archives
chmod 755 logs backups
```

### 5. Test Application
```bash
# Test with production environment
NODE_ENV=production node index.js
# Should start without errors, then Ctrl+C to stop
```

## Process Management

### 1. Configure PM2 Ecosystem
The `ecosystem.config.js` file is already configured. Update the deployment section:

```javascript
// Update ecosystem.config.js deployment section
deploy: {
  production: {
    user: 'your-username',
    host: ['your-production-server.com'],
    ref: 'origin/main',
    repo: 'git@github.com:your-username/cryptique.git',
    path: '/var/www/cryptique-backend',
    'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
    'pre-setup': 'apt update && apt install git -y'
  }
}
```

### 2. Start Application with PM2
```bash
# Start all processes
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs cryptique-backend
pm2 logs cryptique-rag-worker
pm2 logs cryptique-monitor

# Monitor processes
pm2 monit
```

### 3. Save PM2 Configuration
```bash
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

## Monitoring Setup

### 1. Configure Log Rotation
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/cryptique << EOF
/var/www/cryptique-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 2. Setup Health Check Endpoint
Create a health check script:
```bash
# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3001/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Health check passed"
    exit 0
else
    echo "❌ Health check failed (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x scripts/health-check.sh
```

### 3. Configure Monitoring Alerts
Update your monitoring worker configuration to send alerts to your preferred channels (Slack, email, etc.).

## Security Configuration

### 1. Firewall Setup
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Nginx Configuration
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/cryptique << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (update paths to your certificates)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Rate Limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/cryptique /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 3. SSL Certificate Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Backup Configuration

### 1. Setup Backup Directories
```bash
sudo mkdir -p /var/backups/cryptique
sudo chown $USER:$USER /var/backups/cryptique
```

### 2. Configure Backup Script
Make backup script executable:
```bash
chmod +x scripts/backup.sh
chmod +x scripts/backup-vectors.js
```

### 3. Schedule Automated Backups
```bash
# Add to crontab
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /var/www/cryptique-backend/scripts/backup.sh >> /var/backups/cryptique/logs/cron.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 BACKUP_RETENTION_DAYS=30 /var/www/cryptique-backend/scripts/backup.sh >> /var/backups/cryptique/logs/weekly-cron.log 2>&1
```

## Health Checks

### 1. Application Health Check
```bash
# Test health endpoint
curl -f http://localhost:3001/health
```

### 2. PM2 Health Check
```bash
# Check PM2 processes
pm2 status
pm2 describe cryptique-backend
```

### 3. Database Health Check
```bash
# Test database connection
node -e "
require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => mongoose.connection.db.admin().ping())
  .then(() => { console.log('✅ Database healthy'); process.exit(0); })
  .catch(err => { console.error('❌ Database unhealthy:', err); process.exit(1); });
"
```

## Deployment Commands

### Initial Deployment
```bash
# 1. Clone and setup
git clone https://github.com/your-username/cryptique.git /var/www/cryptique-backend
cd /var/www/cryptique-backend

# 2. Install dependencies
npm ci --production

# 3. Configure environment
cp config/env.example .env.production
# Edit .env.production with your values

# 4. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 5. Configure Nginx
# Copy Nginx configuration and reload
```

### Updates and Rollbacks
```bash
# Update deployment
git pull origin main
npm ci --production
pm2 reload ecosystem.config.js --env production

# Rollback (if needed)
git checkout previous-commit-hash
npm ci --production
pm2 reload ecosystem.config.js --env production
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs cryptique-backend --lines 50

# Check environment
node -e "console.log(process.env.NODE_ENV)"

# Test manually
NODE_ENV=production node index.js
```

#### 2. Database Connection Issues
```bash
# Test connection
node -e "
require('dotenv').config({ path: '.env.production' });
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
"

# Check network connectivity
ping your-mongodb-host.com
```

#### 3. High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart cryptique-backend

# Check for memory leaks
pm2 logs cryptique-backend | grep -i memory
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew

# Test SSL
curl -I https://your-domain.com
```

### Log Locations
- Application logs: `/var/www/cryptique-backend/logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

### Performance Monitoring
```bash
# System resources
htop
df -h
free -h

# PM2 monitoring
pm2 monit

# Nginx status
sudo systemctl status nginx

# Application metrics
curl http://localhost:3001/metrics
```

## Security Checklist

- [ ] Firewall configured and enabled
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Environment variables secured (600 permissions)
- [ ] Database access restricted to application server
- [ ] Regular security updates scheduled
- [ ] Backup encryption configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Access logs monitored
- [ ] Intrusion detection considered

## Maintenance Schedule

### Daily
- Monitor application health
- Check error logs
- Verify backup completion

### Weekly
- Review performance metrics
- Update dependencies (if needed)
- Security updates
- Log rotation cleanup

### Monthly
- Full system backup
- Security audit
- Performance optimization review
- Capacity planning review

---

For additional support, refer to:
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)
- [Incident Response](./INCIDENT_RESPONSE.md)
- [Backup Recovery](./BACKUP_RECOVERY.md) 