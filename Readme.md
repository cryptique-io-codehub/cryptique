# Cryptique Analytics Platform

A comprehensive analytics platform for web3 and blockchain applications, providing real-time tracking, user journey analysis, and transaction monitoring capabilities.

## Project Structure

This repository contains the main Cryptique application divided into three main components:

```
cryptique/
├── client/          # Frontend React application
├── server/          # Real-time analytics and data processing server
├── backend/         # API and business logic server
└── docs/            # Documentation files
```

## Components Overview

### 1. Client Application (`/client`)

The frontend React application that provides the user interface for the analytics dashboard.

- **Technologies**: React, Chart.js, Material UI, Tailwind CSS
- **Key Features**:
  - Interactive dashboards and visualizations
  - User journey analysis
  - Real-time analytics monitoring
  - Smart contract monitoring
  - Subscription management

### 2. Backend API Server (`/backend`)

Handles API requests, authentication, and business logic.

- **Technologies**: Node.js, Express, MongoDB
- **Key Components**:
  - **Controllers**: Business logic implementation for different features
    - `campaignController.js`: Campaign tracking and management
    - `onChainController.js`: Blockchain data processing
    - `sdkController.js`: SDK request handling
    - `smartContractController.js`: Smart contract analytics
    - `teamController.js`: Team management
    - `transactionController.js`: Transaction data processing
    - `userAuthController.js`: User authentication
    - `websiteController.js`: Website management
  - **Routes**: API endpoint definitions
  - **Models**: Database schema definitions
  - **Middleware**: Request processing middleware
  - **Config**: Application configuration
  - **Utils**: Utility functions and helpers
  - **Scripts**: Maintenance and setup scripts

### 3. Analytics Server (`/server`)

Dedicated server for real-time data processing and analytics aggregation.

- **Technologies**: Node.js, Express, MongoDB
- **Key Components**:
  - **Routes**: API endpoints for data collection and retrieval
    - `analytics.js`: Analytics data endpoints
    - `retention.js`: User retention calculation
    - `smartContracts.js`: Smart contract data
    - `stripe.js`: Payment processing
    - `teams.js`: Team management
    - `usage.js`: Usage statistics
    - `websites.js`: Website tracking
  - **Middleware**: Request processing
    - `rateLimiter.js`: Rate limiting for API endpoints
    - `subscriptionCheck.js`: Subscription validation
    - `limitChecker.js`: Usage limit enforcement
  - **Tools**: Advanced data processing tools
    - `monitor.js`: System monitoring
    - `taskRunner.js`: Background task execution
  - **Tasks**: Scheduled maintenance tasks
    - `taskScheduler.js`: Task scheduling system
    - `executors/*`: Individual task implementations

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- MongoDB
- Firebase CLI (for deployment)

### Setting Up the Development Environment

1. **Install dependencies for all components:**

```bash
# Install main app dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Install backend dependencies
cd ../backend
npm install
```

2. **Environment Configuration**

Copy the example environment files and configure them:

```bash
# For backend
cp backend/config/env.example backend/.env

# For server
cp server/config/env.example server/.env
```

3. **Start development servers**

```bash
# Start the entire application in development mode
npm run dev
```

This will start:
- The client on http://localhost:3000
- The backend on http://localhost:3001
- The analytics server on http://localhost:3003

## Key Features

### Real-time Analytics
- 15-minute interval aggregation
- Live user journey tracking
- Session analytics

### Blockchain Analytics
- Smart contract monitoring
- Transaction analysis
- Web3 wallet tracking

### User Journey Analysis
- Conversion funnel visualization
- User path analysis
- Drop-off detection

### Integration
- Easy website integration via SDK
- Custom event tracking
- Data segmentation

## Architecture

The Cryptique platform follows a microservices architecture:

1. **Client SDK**: Collects data from websites and sends it to the analytics server
2. **Analytics Server**: Processes incoming data in real-time and performs initial aggregation
3. **Backend API**: Provides business logic and access to processed data
4. **Frontend Client**: Visualizes the data and provides user interface

Data flows through the system as follows:
1. Website visitors trigger events captured by the SDK
2. Events are sent to the analytics server for processing
3. Data is stored in MongoDB with appropriate aggregation
4. Frontend requests data from the backend API
5. Visualizations are rendered in the dashboard

## Deployment

### Firebase Deployment

```bash
firebase deploy
```

### Vercel Deployment

The project includes vercel.json configuration files for each component that needs to be deployed to Vercel.

## Security Considerations

- All API endpoints use appropriate authentication
- Rate limiting is implemented to prevent abuse
- Data is securely stored with proper access controls
- CORS is configured to allow only authorized origins

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

[MIT License](LICENSE)