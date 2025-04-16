# Cryptique Analytics

Real-time analytics service with 15-minute interval aggregation.

## Features

- Real-time data processing
- 15-minute interval aggregation
- 24-hour data retention
- Automatic data cleanup
- Memory-efficient storage

## Recent Updates

### Analytics Service (v1.1.0)

- Added real-time data processing
- Implemented 15-minute interval aggregation
- Added data retention for 24 hours
- Implemented automatic cleanup of old data
- Optimized memory usage with efficient data structures

### Deployment Update

- Improved Vercel build configuration
- Updated documentation

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

- `GET /api/analytics/chart` - Get analytics data
  - Query parameters:
    - `siteId` (optional) - Site identifier
    - `timeframe` (optional) - Data timeframe (daily by default)

- `GET /api/analytics/test` - Test endpoint

## Data Structure

Analytics data is stored in 15-minute intervals with the following structure:

```javascript
{
  timestamp: "ISO-8601 timestamp",
  visitors: number,
  pageViews: number,
  rawPoints: [
    {
      timestamp: "ISO-8601 timestamp",
      visitors: number,
      pageViews: number
    }
  ]
}
```