# Cryptique Architecture Documentation

This document provides a detailed technical overview of the Cryptique analytics platform architecture.

## System Architecture

Cryptique uses a microservices architecture consisting of the following components:

```
┌───────────────┐     ┌────────────────┐     ┌────────────────┐
│  Client Site  │────▶│  Cryptique SDK │────▶│ Analytics      │
│  (JavaScript) │     │  (Express)     │     │ Server         │
└───────────────┘     └────────────────┘     └───────┬────────┘
                                                     │
┌───────────────┐     ┌────────────────┐     ┌───────▼────────┐
│  Dashboard    │◀───▶│  Backend API   │◀───▶│  MongoDB       │
│  (React)      │     │  (Express)     │     │  Database      │
└───────────────┘     └────────────────┘     └────────────────┘
```

## Component Details

### 1. Client Application (`/client`)

#### Directory Structure

```
client/
├── public/                  # Static assets and HTML template
├── src/
│   ├── api/                 # API integration and services
│   ├── assets/              # Images, fonts, and other static assets
│   ├── components/          # Reusable UI components
│   │   ├── Header.js        # Application header component
│   │   ├── Sidebar.js       # Navigation sidebar
│   │   └── ...
│   ├── context/             # React context providers
│   ├── data/                # Static data and constants
│   ├── pages/               # Page components
│   ├── redux/               # State management (Redux)
│   ├── services/            # Service integrations
│   ├── styles/              # CSS and styling
│   ├── utils/               # Utility functions
│   ├── App.js               # Main application component
│   ├── axiosInstance.js     # Configured Axios for API requests
│   ├── index.js             # Application entry point
│   └── setupProxy.js        # Development proxy configuration
├── package.json             # Dependencies and scripts
└── tailwind.config.js       # Tailwind CSS configuration
```

#### Key Files and Their Purposes

- **src/App.js**: Main application component that defines routes and layout
- **src/components/Header.js**: Application header with navigation and user controls
- **src/components/Sidebar.js**: Navigation sidebar with links to different sections
- **src/components/UserJourneyPopup.js**: Component for displaying user journey details
- **src/axiosInstance.js**: Configured Axios instance for making API requests with authentication

### 2. Backend API (`/backend`)

#### Directory Structure

```
backend/
├── config/                  # Configuration files
│   ├── database.js          # Database connection configuration
│   └── env.example          # Example environment variables
├── controllers/             # Request handlers and business logic
│   ├── campaignController.js
│   ├── onChainController.js
│   ├── sdkController.js
│   ├── smartContractController.js
│   ├── teamController.js
│   ├── transactionController.js
│   ├── userAuthController.js
│   └── websiteController.js
├── middleware/              # Request processing middleware
│   ├── auth.js              # Authentication middleware
│   ├── authMiddleware.js    # Additional auth middleware
│   └── rateLimiter.js       # Rate limiting middleware
├── models/                  # Database models and schemas
├── routes/                  # API route definitions
│   ├── analytics.js         # Analytics endpoints
│   ├── aiRouter.js          # AI features endpoints
│   ├── campaignRouter.js    # Campaign management endpoints
│   ├── healthRouter.js      # Health check endpoints
│   ├── onChainRouter.js     # Blockchain data endpoints
│   ├── sdkRouter.js         # SDK integration endpoints
│   ├── smartContractRouter.js # Smart contract endpoints
│   ├── stripeRouter.js      # Payment processing endpoints
│   ├── teamRouter.js        # Team management endpoints
│   ├── transactionRouter.js # Transaction endpoints
│   ├── userRouter.js        # User management endpoints
│   └── websiteRouter.js     # Website management endpoints
├── scripts/                 # Utility scripts
│   ├── fix-transaction-index.js # Database migration script
│   └── generateTestData.js  # Test data generation
├── utils/                   # Utility functions and helpers
├── index.js                 # Application entry point
├── package.json             # Dependencies and scripts
└── vercel.json              # Vercel deployment configuration
```

#### Key Controllers

- **sdkController.js**: Handles SDK integration requests, tracking, and data collection
- **smartContractController.js**: Processes blockchain contract data and analytics
- **teamController.js**: Manages team creation, updates, and permissions
- **transactionController.js**: Processes blockchain transaction data
- **userAuthController.js**: Handles user authentication and authorization
- **websiteController.js**: Manages website registration and configuration

### 3. Analytics Server (`/server`)

#### Directory Structure

```
server/
├── config/                  # Configuration files
│   ├── architecture.js      # System architecture configuration
│   ├── database.js          # Database connection configuration
│   ├── env.example          # Example environment variables
│   └── stripe.js            # Stripe payment integration
├── middleware/              # Request processing middleware
│   ├── rateLimiter.js       # Rate limiting middleware
│   ├── subscriptionCheck.js # Subscription validation
│   └── limitChecker.js      # Usage limit enforcement
├── models/                  # Database models
├── routes/                  # API endpoints
│   ├── analytics.js         # Analytics data endpoints
│   ├── retention.js         # User retention calculation
│   ├── smartContracts.js    # Smart contract data endpoints
│   ├── stripe.js            # Payment processing
│   ├── teams.js             # Team management
│   ├── usage.js             # Usage statistics
│   ├── websites.js          # Website tracking
│   └── webhooks/            # Webhook handlers
│       └── stripe.js        # Stripe webhook processor
├── services/                # Business logic services
├── tasks/                   # Scheduled tasks
│   ├── executors/           # Task implementation
│   │   ├── delete_expired_data.js # Data cleanup task
│   │   └── mark_expired_data.js   # Data expiration marking
│   ├── scheduledTasks.js    # Task definitions
│   └── taskScheduler.js     # Task scheduling system
├── tools/                   # Utility tools
│   ├── monitor.js           # System monitoring
│   └── taskRunner.js        # Background task execution
├── utils/                   # Utility functions
├── cluster.js               # Cluster mode for scaling
├── index.js                 # Application entry point
└── package.json             # Dependencies and scripts
```

#### Key Features

- **Clustered Architecture**: Uses Node.js clustering for better performance
- **Scheduled Tasks**: Background processing for data aggregation and cleanup
- **Real-time Processing**: Processes incoming data in real-time
- **Data Aggregation**: Aggregates data at different time intervals (15min, hourly, daily)

## Data Flow

1. **Data Collection**:
   - User interacts with a website that has the Cryptique script installed
   - Script tracks page views, user actions, and other metrics
   - For Web3 sites, the script can track wallet connections and transactions

2. **Data Processing**:
   - Analytics server receives raw data points
   - Data is validated and processed
   - Real-time aggregation happens at 15-minute intervals

3. **Storage**:
   - Processed data is stored in MongoDB
   - Different collections store data at various aggregation levels
   - Data retention policies are applied automatically

4. **Retrieval and Visualization**:
   - Dashboard requests data from backend API
   - API retrieves aggregated data from the database
   - Data is transformed for visualization
   - Frontend renders charts, tables, and other visualizations

## Authentication and Security

### Authentication Flow

1. Users register and log in through the frontend
2. Backend generates JWT tokens for authentication
3. Frontend stores tokens and includes them in API requests
4. Backend validates tokens for each protected endpoint

### API Security

- All endpoints use appropriate authentication
- Rate limiting prevents abuse
- Input validation prevents injection attacks
- CORS is configured to allow only authorized origins

### Data Security

- Sensitive data is encrypted at rest
- Database access is restricted by role
- Regular security audits are performed

## Deployment Architecture

### Production Environment

The application is deployed on a combination of platforms:

- **Frontend**: Hosted on Firebase Hosting
- **Backend and Analytics Server**: Deployed on Vercel as serverless functions
- **SDK**: Deployed on Vercel as a separate service
- **Database**: MongoDB Atlas cloud database

### Scaling Strategy

- **Horizontal Scaling**: Multiple instances of each service
- **Database Sharding**: For handling large data volumes
- **CDN**: For delivering static assets and the SDK script

## Monitoring and Maintenance

- **Health Checks**: Regular health checks ensure system availability
- **Logging**: Comprehensive logging for troubleshooting
- **Alerts**: Automated alerts for system issues
- **Scheduled Maintenance**: Regular data cleanup and optimization

## Development Workflow

1. Local development environment with hot reloading
2. Staging environment for testing
3. Production deployment with CI/CD pipeline
4. Rollback capabilities for emergencies 