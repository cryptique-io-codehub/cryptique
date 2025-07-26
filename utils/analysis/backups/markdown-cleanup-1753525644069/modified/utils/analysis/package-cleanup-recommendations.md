# Package Dependencies Cleanup Analysis

## Executive Summary

The analysis of package.json files across the codebase revealed significant opportunities for cleanup and consolidation:

- **12 duplicate dependencies** across multiple packages
- **9 version conflicts** requiring alignment
- **Multiple unused dependencies** that can be safely removed
- Opportunities to consolidate common dependencies

## Critical Issues Found

### 1. Version Conflicts (High Priority)

These dependencies have different versions across packages, which can cause compatibility issues:

| Dependency | Backend | Client | Server | Recommended Action |
|------------|---------|--------|--------|-------------------|
| `@google/generative-ai` | ^0.20.0 | ^0.1.3 | ^0.1.0 | Align to ^0.20.0 (latest) |
| `axios` | ^1.8.4 | ^1.8.4 | ^0.27.2 | Align to ^1.8.4 (latest) |
| `mongoose` | ^8.14.1 | - | ^6.5.2 | Align to ^8.14.1 (latest) |
| `express` | ^4.21.2 | - | ^4.18.1 | Align to ^4.21.2 (latest) |
| `express-rate-limit` | ^7.5.0 | - | ^6.7.0 | Align to ^7.5.0 (latest) |
| `uuid` | ^11.1.0 | ^11.1.0 | ^9.0.0 | Align to ^11.1.0 (latest) |

### 2. Unused Dependencies (Medium Priority)

#### Root Package
- `@google/genai` ^1.0.1 - Not used anywhere
- `concurrently` ^8.2.2 - Used in scripts but could be dev dependency
- `ethers` ^6.13.5 - Not used anywhere

#### Backend Package
- `@duneanalytics/client-sdk` ^0.2.5 - Not used
- `node-cron` ^3.0.3 - Not used (but used in server)
- `nodemon` ^3.1.9 - Should be dev dependency
- `puppeteer` ^24.5.0 - Not used
- `chalk` ^4.1.2 - Not used (dev)
- `mocha` ^10.2.0 - Not used (dev)

#### Client Package
- `@emotion/react` ^11.14.0 - Not used
- `@emotion/styled` ^11.14.0 - Not used
- `@headlessui/react` ^2.2.4 - Not used
- `chart.js` ^4.4.8 - Not used
- `jsonwebtoken` ^9.0.2 - Not used in client
- `jwt-decode` ^4.0.0 - Not used
- `react-chartjs-2` ^5.3.0 - Not used
- `react-grid-layout` ^1.5.1 - Not used
- `react-icons` ^5.5.0 - Not used
- `react-scripts` 5.0.1 - Should be used (React build tool)
- `react-simple-maps` ^3.0.0 - Not used
- `web-vitals` ^2.1.4 - Not used
- `tailwindcss` ^3.4.17 - Not used (dev)

#### Server Package
- `@tensorflow/tfjs-node` ^4.10.0 - Not used
- `langchain` ^0.0.100 - Not used
- `natural` ^6.5.0 - Not used
- `express-http-proxy` ^1.6.3 - Not used
- `sticky-session` ^1.1.2 - Not used
- `node-os-utils` ^1.3.7 - Not used
- `jest` ^28.1.3 - Not used (dev)
- `nodemon` ^2.0.19 - Not used (dev)
- `supertest` ^6.2.4 - Not used (dev)

### 3. Duplicate Dependencies (Low Priority)

These dependencies appear in multiple packages and could be consolidated:

- `cors` (backend, server) - Same version ^2.8.5
- `dotenv` (backend, server) - Minor version difference
- `node-cache` (backend, server) - Same version ^5.1.2
- `node-cron` (backend, server) - Minor version difference

## Recommendations

### Phase 1: Critical Version Alignment
1. Update `@google/generative-ai` to ^0.20.0 in client and server
2. Update `axios` to ^1.8.4 in server
3. Update `mongoose` to ^8.14.1 in server
4. Update `express` to ^4.21.2 in server
5. Update `express-rate-limit` to ^7.5.0 in server
6. Update `uuid` to ^11.1.0 in server

### Phase 2: Remove Unused Dependencies
1. Remove clearly unused dependencies from each package
2. Move development tools to devDependencies where appropriate
3. Verify removal doesn't break any dynamic imports

### Phase 3: Consolidation (Optional)
1. Consider moving shared backend/server dependencies to root
2. Use workspaces or lerna for better dependency management
3. Create shared dependency configuration

## Risk Assessment

### Low Risk Removals
- `@google/genai` (root) - Not used
- `ethers` (root) - Not used
- `@duneanalytics/client-sdk` (backend) - Not used
- `puppeteer` (backend) - Not used

### Medium Risk Removals
- Testing libraries in client (may be used by React scripts)
- `nodemon` dependencies (verify not used in scripts)

### High Risk Changes
- Version updates for `mongoose` (major version difference)
- Version updates for `express-rate-limit` (major version difference)

## Implementation Priority

1. **High Priority**: Fix version conflicts for actively used dependencies
2. **Medium Priority**: Remove clearly unused dependencies
3. **Low Priority**: Consolidate duplicate dependencies

## Next Steps

1. Complete this analysis (Task 7.1) ✓
2. Implement dependency removal (Task 7.2)
3. Test all services after changes
4. Update package-lock.json files
5. Verify no broken imports or functionality