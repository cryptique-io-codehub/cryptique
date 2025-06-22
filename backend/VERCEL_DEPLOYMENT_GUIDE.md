# 🚀 Vercel Deployment Guide - Issue Resolution

## ✅ **Issues Fixed:**

### 1. **Mixed Routing Properties**
**Problem:** Cannot use both `routes` and `rewrites` in the same vercel.json
**Solution:** Removed `routes` and kept only `rewrites` with proper Express.js configuration

### 2. **Conflicting Builds and Functions**
**Problem:** Cannot use both `builds` and `functions` properties
**Solution:** Modernized to use only `functions` configuration

### 3. **Multiple vercel.json Files**
**Problem:** Multiple vercel.json files in different directories causing conflicts
**Solution:** Updated all vercel.json files to use modern configuration

## 📋 **Current Configuration:**

### Backend (cryptique/backend/vercel.json):
```json
{
  "version": 2,
  "name": "cryptique-backend-optimized",
  "functions": {
    "index.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.js"
    }
  ]
}
```

### SDK (cryptique-sdk/vercel.json):
```json
{
  "version": 2,
  "functions": {
    "index.js": {
      "maxDuration": 10,
      "memory": 512
    }
  },
  "headers": [
    {
      "source": "/scripts/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.js"
    }
  ]
}
```

## 🔧 **Environment Variables Setup:**

Set these in your Vercel Dashboard (NOT in vercel.json):

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server
GEMINI_API_KEY=AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs
ADMIN_TOKEN=504234a55377829e58281a3fc9a7ba9b5291d5c8c1cc9c55246f7199f1bf1a74
```

## 🚨 **Common Issues to Avoid:**

### 1. **Never Mix These Properties:**
- ❌ `routes` + `rewrites`
- ❌ `routes` + `redirects`
- ❌ `routes` + `headers`
- ❌ `builds` + `functions`

### 2. **File Conflicts to Check:**
- ❌ Both `vercel.json` and `now.json`
- ❌ Both `.vercel` and `.now` directories
- ❌ Both `.vercelignore` and `.nowignore`
- ❌ Environment variables with both `VERCEL_` and `NOW_` prefixes

### 3. **Configuration Best Practices:**
- ✅ Use `functions` instead of `builds`
- ✅ Use `rewrites` instead of `routes` for modern apps
- ✅ Set environment variables in Vercel Dashboard
- ✅ Use specific memory and duration settings
- ✅ Keep vercel.json minimal and clean

## 📁 **Project Structure:**

```
app3/
├── vercel.json (Frontend config)
├── cryptique/
│   └── backend/
│       └── vercel.json (Backend API config)
└── cryptique-sdk/
    └── vercel.json (SDK config)
```

## 🔄 **Deployment Process:**

1. **Backend Deployment:**
   ```bash
   cd cryptique/backend
   git add .
   git commit -m "Backend updates"
   git push origin main
   ```

2. **SDK Deployment:**
   ```bash
   cd cryptique-sdk
   git add .
   git commit -m "SDK updates"
   git push origin main
   ```

3. **Frontend Deployment:**
   ```bash
   # Root level deployment
   git add .
   git commit -m "Frontend updates"
   git push origin main
   ```

## 🎯 **Migration Commands:**

After successful deployment, run the migration:

```bash
# Check health
curl https://your-backend-url.vercel.app/api/migration/health

# Check status
curl https://your-backend-url.vercel.app/api/migration/status \
  -H "Authorization: Bearer 504234a55377829e58281a3fc9a7ba9b5291d5c8c1cc9c55246f7199f1bf1a74"

# Run migration
curl -X POST https://your-backend-url.vercel.app/api/migration/run \
  -H "Authorization: Bearer 504234a55377829e58281a3fc9a7ba9b5291d5c8c1cc9c55246f7199f1bf1a74"
```

## 🛠️ **Troubleshooting:**

### If deployment still fails:
1. Check Vercel dashboard for specific error messages
2. Verify all environment variables are set correctly
3. Ensure no conflicting configuration files exist
4. Check function timeout and memory limits
5. Verify Node.js version compatibility

### Common Error Messages:
- **"Mixed routing properties"** → Remove `routes` if using `rewrites`
- **"Conflicting functions and builds"** → Use only `functions`
- **"Conflicting configuration files"** → Remove old `now.json` files
- **"Function timeout"** → Increase `maxDuration`
- **"Memory limit exceeded"** → Increase `memory` allocation

## ✅ **Success Indicators:**

- ✅ No deployment errors in GitHub/Vercel
- ✅ Health endpoint responds: `GET /api/migration/health`
- ✅ Environment variables are accessible
- ✅ Database connection works
- ✅ All API endpoints respond correctly

## 📞 **Next Steps:**

1. Monitor the deployment in Vercel dashboard
2. Test all endpoints after successful deployment
3. Run the migration using the provided commands
4. Verify the migration completed successfully
5. Monitor performance metrics

---

**Note:** All configuration changes have been applied and pushed to the main branch. The deployment should now work without conflicts. 