# 🚀 Phase 1 Deployment Guide

This guide will walk you through the complete setup and deployment process for the Phase 1 database optimization and RAG preparation.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup ✅
- [x] MongoDB URI configured
- [x] Gemini API Key configured
- [x] Node.js environment ready

### 2. Dependencies Installation
```bash
# Install new dependencies
npm install @google/generative-ai dotenv
```

### 3. Environment Variables
Create/update your `.env` file with:
```env
MONGODB_URI=mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server
GEMINI_API_KEY=AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs
NODE_ENV=production
PORT=3000
```

## 🧪 Pre-Deployment Testing

### Step 1: Run Comprehensive Tests
```bash
# Run all pre-deployment tests
npm run test:pre-deploy

# Or manually:
node scripts/preDeploymentTest.js
```

This will test:
- ✅ Environment variables
- ✅ Database connectivity
- ✅ Gemini API integration
- ✅ Model schemas
- ✅ Database operations
- ✅ Vector service
- ✅ Database indexes

### Step 2: Review Test Results
The test will generate a detailed report in `scripts/test-report-[timestamp].json`

## 🗄️ Database Migration

### Step 1: Backup Current Data (CRITICAL)
```bash
# Create a backup of your current database
mongodump --uri="mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server" --out=./backup-$(date +%Y%m%d)
```

### Step 2: Run Migration
```bash
# Run the Phase 1 migration
npm run migrate:phase1

# Or manually:
node scripts/migration/phase1Migration.js
```

The migration will:
1. **Create new optimized collections**:
   - `timeseriesstats` (consolidated time series)
   - Enhanced existing collections with new fields

2. **Migrate existing data**:
   - Consolidate hourly/daily/weekly/monthly stats
   - Add vector fields for RAG preparation
   - Update user-team relationships
   - Add TTL indexes for automatic cleanup

3. **Create optimized indexes**:
   - Compound indexes for common queries
   - TTL indexes for data retention
   - Vector search preparation indexes

### Step 3: Verify Migration
```bash
# Check migration status
node scripts/migration/phase1Migration.js --verify
```

## 🔧 MongoDB Atlas Configuration

### 1. Index Optimization
The migration automatically creates these indexes, but verify in MongoDB Atlas:

**TimeseriesStats Collection:**
- `{ "metadata.siteId": 1, "metadata.granularity": 1, "timestamp": 1 }`
- `{ "metadata.siteId": 1, "timestamp": -1 }`
- `{ "expiresAt": 1 }` (TTL: 2 years)

**Sessions Collection:**
- `{ "siteId": 1, "startTime": -1 }`
- `{ "userId": 1, "startTime": -1 }`
- `{ "expiresAt": 1 }` (TTL: 1 year)

**Analytics Collection:**
- `{ "siteId": 1 }`
- `{ "websiteUrl": 1 }`
- `{ "vectorEmbedding": "2dsphere" }` (for future vector search)

### 2. Time Series Collection Setup
MongoDB will automatically optimize the `timeseriesstats` collection as a time series collection with:
- **timeField**: `timestamp`
- **metaField**: `metadata`
- **granularity**: `hours`

### 3. TTL Configuration
Verify automatic data cleanup is configured:
- **Sessions**: 1 year retention
- **Analytics**: 2 years retention
- **GranularEvents**: 6 months retention

## 🚀 Vercel Deployment

### Step 1: Update Vercel Environment Variables
In your Vercel dashboard, add:
```
MONGODB_URI=mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server
GEMINI_API_KEY=AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs
NODE_ENV=production
```

### Step 2: Deploy with Migration
```bash
# Full deployment with migration
npm run deploy:phase1:full
```

### Step 3: Deploy without Migration (if already migrated)
```bash
# Deploy only the code changes
npm run deploy:phase1
```

## 🔍 Post-Deployment Verification

### 1. Test New Endpoints
```bash
# Test the new optimized analytics endpoints
curl https://your-vercel-app.vercel.app/api/analytics/overview/your-site-id
curl https://your-vercel-app.vercel.app/api/analytics/sessions/your-site-id
curl https://your-vercel-app.vercel.app/api/analytics/pages/your-site-id
```

### 2. Verify Data Migration
```bash
# Connect to MongoDB and verify
use Cryptique-Test-Server

# Check new timeseries collection
db.timeseriesstats.countDocuments()
db.timeseriesstats.findOne()

# Verify indexes
db.timeseriesstats.getIndexes()
db.sessions.getIndexes()
db.analytics.getIndexes()
```

### 3. Test Vector Service
```bash
# Test vector embedding generation
curl -X POST https://your-vercel-app.vercel.app/api/vector/test \
  -H "Content-Type: application/json" \
  -d '{"text": "test document for embedding"}'
```

## 📊 Performance Monitoring

### Key Metrics to Monitor:
1. **API Response Times**: Should be 40-60% faster
2. **Database Storage**: Should be 60-80% less for analytics data
3. **Query Performance**: Monitor aggregation pipeline performance
4. **Error Rates**: Watch for any migration-related issues

### MongoDB Atlas Monitoring:
- Check query performance in Atlas
- Monitor index usage
- Verify TTL cleanup is working
- Check time series collection optimization

## 🆘 Rollback Plan

If issues occur, you can rollback:

### 1. Code Rollback
```bash
# Revert to previous Vercel deployment
vercel rollback
```

### 2. Database Rollback
```bash
# Restore from backup (if needed)
mongorestore --uri="mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server" ./backup-YYYYMMDD
```

### 3. Partial Rollback
The new endpoints maintain backward compatibility, so you can:
- Keep using old endpoints while fixing issues
- Gradually migrate frontend to new endpoints

## 🔧 Troubleshooting

### Common Issues:

**1. Migration Fails**
```bash
# Check migration logs
tail -f scripts/migration/migration.log

# Run migration in dry-run mode
node scripts/migration/phase1Migration.js --dry-run
```

**2. Gemini API Issues**
```bash
# Test API key
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('YOUR_API_KEY');
console.log('API key is valid');
"
```

**3. Database Connection Issues**
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('Connected')).catch(console.error);
"
```

**4. Index Creation Issues**
- Check MongoDB Atlas for index creation status
- Verify sufficient database permissions
- Monitor index build progress in Atlas

## 🎯 Success Criteria

✅ **Deployment is successful when:**
- All pre-deployment tests pass
- Migration completes without errors
- New endpoints respond correctly
- Performance improvements are visible
- No increase in error rates
- Vector service initializes properly

## 📞 Support

If you encounter issues:
1. Check the test report for specific errors
2. Review migration logs
3. Verify environment variables in Vercel
4. Check MongoDB Atlas for connection/index issues
5. Monitor Vercel function logs for runtime errors

## 🔄 Next Steps (Phase 2)

After successful Phase 1 deployment:
- Implement full RAG capabilities
- Add AI-powered analytics insights
- Create natural language query interface
- Implement advanced vector search features

---

**Remember**: Always test in a staging environment before production deployment! 