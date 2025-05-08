# Subscription Limits Implementation

This document outlines how subscription limits are enforced throughout the application.

## Plan Limits

| Feature        | Off-chain | Basic | Pro | Enterprise |
|----------------|:---------:|:-----:|:---:|:----------:|
| Websites       | 1         | 2     | 3   | Custom     |
| Smart Contracts| 0         | 1     | 3   | Custom     |
| API Calls      | 0         | 40,000| 150,000 | Custom |
| Team Members   | 1         | 2     | 3   | Custom     |
| CQ Intelligence| No        | Optional Add-on ($299/mo) | Optional Add-on | Optional Add-on |

## Implementation Components

### 1. Server-Side Middleware

Located in `server/middleware/subscriptionCheck.js`:

- `checkFeatureAccess`: Generic middleware to check access to specific features
- Feature-specific middlewares:
  - `checkWebsiteAccess`: Checks website limits
  - `checkContractAccess`: Checks smart contract limits
  - `checkTeamMemberAccess`: Checks team member limits
  - `checkCQIntelligenceAccess`: Checks if team has access to CQ Intelligence
- `trackApiUsage`: Tracks and restricts API call usage

### 2. Client-Side Components

#### Custom Hook

Located in `client/src/hooks/useSubscriptionCheck.js`:

- Provides feature access checks
- Returns usage and limit information
- Can redirect to billing page when limits are reached

#### UI Components

- `UpgradePrompt` (`client/src/components/UpgradePrompt.js`): Displays when a feature limit is reached
- `CQIntelligenceAccess` (`client/src/components/CQIntelligenceAccess.js`): Wrapper for CQ Intelligence features

### 3. UI Integration Points

The following components have been updated to enforce limits:

- **ManageWebsites**: Enforces website limits
- **OnchainExplorer**: Enforces smart contract limits
- **MembersSection**: Enforces team member limits

### 4. Subscription Service

Located in `server/services/subscriptionService.js`:

- `hasFeatureAccess`: Core method to check if a team has access to a feature
- `getActiveSubscription`: Gets the team's active subscription

## How Limits Are Enforced

### Frontend Approach

1. UI prevents actions that would exceed limits
2. Shows usage limits with progress bars
3. Directs users to the billing page to upgrade when needed

### Backend Approach

1. All critical API endpoints check subscription limits before processing
2. Returns 403 Forbidden with upgrade information when limits are exceeded
3. Tracks API usage for rate-limiting purposes

## Future Improvements

1. Implement a more sophisticated API call tracking system using a database or Redis
2. Add detailed analytics about feature usage and limit approaching notifications
3. Implement a grace period for exceeded limits
4. Add automatic notifications when approaching limits 