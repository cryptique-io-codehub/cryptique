# Cryptique RAG System - Rollback Procedures

## Overview
This document outlines procedures for rolling back deployments and recovering from incidents in the Cryptique RAG system.

## Emergency Contacts
- **Primary DevOps**: [Your contact]
- **Database Admin**: [Your contact]
- **Team Lead**: [Your contact]

## Quick Rollback Commands

### 1. Application Rollback
```bash
# Get current commit hash
git log --oneline -5

# Rollback to previous commit
git checkout <previous-commit-hash>
npm ci --production
pm2 reload ecosystem.config.js --env production

# Or rollback to specific tag
git checkout tags/v1.0.0
npm ci --production
pm2 reload ecosystem.config.js --env production
```

### 2. Database Rollback
```bash
# Stop application first
pm2 stop ecosystem.config.js

# Restore from backup
mongorestore --uri="$MONGODB_URI" --drop /var/backups/cryptique/mongodb/mongo_YYYYMMDD_HHMMSS/

# Restart application
pm2 start ecosystem.config.js --env production
```

### 3. Vector Store Rollback
```bash
# Restore vector documents
node scripts/restore-vectors.js /var/backups/cryptique/vectors/vectors_YYYYMMDD_HHMMSS/
```

## Detailed Rollback Procedures

### Application Code Rollback

#### Step 1: Identify Target Version
```bash
# List recent commits
git log --oneline -10

# List available tags
git tag -l

# Check current deployment
pm2 describe cryptique-backend
```

#### Step 2: Prepare Rollback
```bash
# Create backup of current state
git tag "rollback-$(date +%Y%m%d_%H%M%S)"

# Stop health checks temporarily
sudo systemctl stop cryptique-health-check

# Scale down to single instance
pm2 scale cryptique-backend 1
```

#### Step 3: Execute Rollback
```bash
# Checkout target version
git checkout <target-commit-or-tag>

# Install dependencies
npm ci --production

# Reload application
pm2 reload ecosystem.config.js --env production

# Wait for health check
sleep 30
curl -f http://localhost:3001/health
```

#### Step 4: Verify Rollback
```bash
# Check application status
pm2 status
pm2 logs cryptique-backend --lines 50

# Test critical endpoints
curl -f http://localhost:3001/health
curl -f http://localhost:3001/api/status

# Check database connectivity
node -e "
require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ DB OK'); process.exit(0); })
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });
"
```

#### Step 5: Scale Back Up
```bash
# Scale back to full capacity
pm2 scale cryptique-backend max

# Re-enable health checks
sudo systemctl start cryptique-health-check

# Monitor for 10 minutes
pm2 monit
```

### Database Rollback

#### Step 1: Assess Damage
```bash
# Check database status
mongosh "$MONGODB_URI" --eval "db.runCommand({serverStatus: 1})"

# List collections and document counts
mongosh "$MONGODB_URI" --eval "
  db.adminCommand('listCollections').cursor.firstBatch.forEach(
    function(collection) {
      print(collection.name + ': ' + db.getCollection(collection.name).countDocuments())
    }
  )
"
```

#### Step 2: Stop Application
```bash
# Gracefully stop all services
pm2 stop ecosystem.config.js

# Verify no connections
mongosh "$MONGODB_URI" --eval "db.serverStatus().connections"
```

#### Step 3: Backup Current State
```bash
# Create emergency backup
mongodump --uri="$MONGODB_URI" --out="/var/backups/cryptique/emergency_$(date +%Y%m%d_%H%M%S)"
```

#### Step 4: Restore from Backup
```bash
# Choose backup to restore
ls -la /var/backups/cryptique/mongodb/

# Restore database (this will drop existing data)
mongorestore --uri="$MONGODB_URI" --drop /var/backups/cryptique/mongodb/mongo_YYYYMMDD_HHMMSS/

# Verify restoration
mongosh "$MONGODB_URI" --eval "
  db.adminCommand('listCollections').cursor.firstBatch.forEach(
    function(collection) {
      print(collection.name + ': ' + db.getCollection(collection.name).countDocuments())
    }
  )
"
```

#### Step 5: Restart Application
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Monitor startup
pm2 logs cryptique-backend
```

### Vector Store Rollback

#### Step 1: Create Restore Script
```javascript
// scripts/restore-vectors.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const VectorDocument = require('../models/vectorDocument');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');

async function restoreVectors(backupDir) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing vector data
    await VectorDocument.deleteMany({});
    await EmbeddingJob.deleteMany({});
    await EmbeddingStats.deleteMany({});
    
    // Restore vector documents
    const vectorData = JSON.parse(fs.readFileSync(path.join(backupDir, 'vector_documents.json')));
    await VectorDocument.insertMany(vectorData);
    
    // Restore embedding jobs
    const jobData = JSON.parse(fs.readFileSync(path.join(backupDir, 'embedding_jobs.json')));
    await EmbeddingJob.insertMany(jobData);
    
    // Restore embedding stats
    const statsData = JSON.parse(fs.readFileSync(path.join(backupDir, 'embedding_stats.json')));
    await EmbeddingStats.insertMany(statsData);
    
    console.log('Vector store restored successfully');
    process.exit(0);
  } catch (error) {
    console.error('Vector restore failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error('Usage: node restore-vectors.js <backup-directory>');
    process.exit(1);
  }
  restoreVectors(backupDir);
}
```

#### Step 2: Execute Vector Restore
```bash
# Stop RAG workers
pm2 stop cryptique-rag-worker

# Restore vectors
node scripts/restore-vectors.js /var/backups/cryptique/vectors/vectors_YYYYMMDD_HHMMSS/

# Restart RAG workers
pm2 start cryptique-rag-worker
```

## Configuration Rollback

### Environment Variables
```bash
# Backup current config
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp .env.production.backup.YYYYMMDD_HHMMSS .env.production

# Restart application
pm2 restart ecosystem.config.js --env production
```

### Nginx Configuration
```bash
# Backup current config
sudo cp /etc/nginx/sites-available/cryptique /etc/nginx/sites-available/cryptique.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
sudo cp /etc/nginx/sites-available/cryptique.backup.YYYYMMDD_HHMMSS /etc/nginx/sites-available/cryptique

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Rollback Verification Checklist

### Application Health
- [ ] Application starts without errors
- [ ] Health endpoint responds (200 OK)
- [ ] Database connectivity verified
- [ ] All PM2 processes running
- [ ] Memory usage normal
- [ ] No error spikes in logs

### Functionality Tests
- [ ] User authentication works
- [ ] API endpoints respond correctly
- [ ] RAG system processes documents
- [ ] Vector search functions
- [ ] Monitoring dashboard accessible

### Performance Checks
- [ ] Response times normal
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] Database queries performing well
- [ ] No rate limiting issues

## Rollback Decision Matrix

| Severity | Condition | Action |
|----------|-----------|---------|
| **Critical** | Data corruption, security breach | Immediate rollback |
| **High** | Application down, major functionality broken | Rollback within 15 minutes |
| **Medium** | Performance degradation, minor functionality issues | Rollback within 1 hour |
| **Low** | Minor bugs, cosmetic issues | Fix forward or schedule rollback |

## Communication Template

### Internal Alert
```
🚨 ROLLBACK IN PROGRESS 🚨

System: Cryptique RAG Backend
Severity: [Critical/High/Medium/Low]
Reason: [Brief description]
Rollback Target: [commit/tag/version]
ETA: [estimated completion time]
Impact: [user-facing impact]

Status updates will follow every 15 minutes.
```

### User Communication
```
We're currently experiencing technical difficulties and are working to restore normal service. 
We expect to have this resolved within [timeframe]. 
We apologize for any inconvenience.
```

## Post-Rollback Actions

### Immediate (0-30 minutes)
1. Verify all systems operational
2. Monitor error rates and performance
3. Update incident tracking
4. Communicate resolution to stakeholders

### Short-term (30 minutes - 2 hours)
1. Analyze root cause of original issue
2. Document lessons learned
3. Update monitoring/alerting if needed
4. Plan fix for rolled-back changes

### Long-term (2+ hours)
1. Implement proper fix
2. Test thoroughly in staging
3. Plan re-deployment strategy
4. Update rollback procedures if needed

## Testing Rollback Procedures

### Monthly Rollback Drill
```bash
# 1. Create test deployment
git checkout -b rollback-test-$(date +%Y%m%d)

# 2. Make harmless change
echo "// Rollback test $(date)" >> test-file.js
git add . && git commit -m "Rollback test"

# 3. Deploy test change
pm2 reload ecosystem.config.js --env production

# 4. Execute rollback procedure
git checkout main
pm2 reload ecosystem.config.js --env production

# 5. Verify rollback successful
# 6. Document any issues found
```

## Emergency Procedures

### Complete System Recovery
```bash
# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Restore from full backup
./scripts/full-restore.sh /var/backups/cryptique/full_backup_YYYYMMDD

# 3. Start services
sudo systemctl start nginx
pm2 start ecosystem.config.js --env production

# 4. Verify system health
./scripts/health-check.sh
```

### Contact Information
- **Emergency Hotline**: [Phone number]
- **Slack Channel**: #cryptique-incidents
- **Email**: devops@cryptique.io

---

**Remember**: When in doubt, prioritize data integrity and user safety over feature availability. 