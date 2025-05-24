# Cryptique Developer Guide

This guide provides instructions for developers who want to extend or modify the Cryptique analytics platform.

## Development Environment Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Git
- Code editor (VS Code recommended)

### Setup Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd cryptique
```

2. Install dependencies for all components:
```bash
# Root dependencies
npm install

# Client application
cd client
npm install

# Backend API server
cd ../backend
npm install

# Analytics server
cd ../server
npm install
```

3. Configure environment variables:
   - Copy the example environment files to `.env` in each component directory
   - Update the variables with your local development settings

4. Start the development servers:
```bash
# In the cryptique directory
npm run dev
```

## Project Structure and Conventions

### Coding Conventions

- Use ES6+ JavaScript features
- Follow the Airbnb JavaScript style guide
- Use async/await for asynchronous operations
- Document functions with JSDoc comments

### File Organization

- Keep related functionality in the same directory
- Use descriptive file and directory names
- Follow established patterns for each component

## Extending the Platform

### Adding a New Analytics Metric

1. **Update the SDK Script** (coordinating with the SDK team):
   - Add a function to collect the new metric
   - Include the metric in the data sent to the server

2. **Update the Analytics Server** (`server/routes/analytics.js`):
   - Add endpoint to receive and process the new metric
   - Update database models to store the new data

3. **Update the Backend API** (`backend/controllers`):
   - Add or modify controller methods to retrieve the new metric
   - Create API endpoints to expose the data

4. **Update the Frontend** (`client/src`):
   - Add visualization components for the new metric
   - Create or update dashboard pages to display the data

### Example: Adding a "Time on Page" Metric

#### 1. SDK Script Update (coordination with SDK team)

```javascript
// Coordinate with SDK team to add this to the script.js

// Add tracking function
function trackTimeOnPage() {
  let startTime = Date.now();
  let tracked = false;
  
  // Track when user leaves the page
  window.addEventListener('beforeunload', () => {
    if (!tracked) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      trackEvent('time_on_page', { seconds: timeSpent, page: window.location.pathname });
      tracked = true;
    }
  });
  
  // Also track when user navigates to another page without unloading
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !tracked) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      trackEvent('time_on_page', { seconds: timeSpent, page: window.location.pathname });
      tracked = true;
    }
  });
}

// Add to initialization
function initAnalytics() {
  // ... existing code
  trackTimeOnPage();
  // ... existing code
}
```

#### 2. Analytics Server Update

```javascript
// In server/routes/analytics.js

// Add endpoint to handle time on page events
router.post('/events/time-on-page', authenticateRequest, async (req, res) => {
  try {
    const { siteId, userId, sessionId, seconds, page } = req.body;
    
    // Validate the request
    if (!siteId || !userId || !sessionId || !seconds || !page) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store the data
    const timeOnPage = new TimeOnPage({
      siteId,
      userId,
      sessionId,
      seconds,
      page,
      timestamp: new Date()
    });
    
    await timeOnPage.save();
    
    // Update aggregated stats
    await updatePageTimeStats(siteId, page, seconds);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking time on page:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add helper function to update stats
async function updatePageTimeStats(siteId, page, seconds) {
  try {
    // Update daily stats
    await PageTimeStats.findOneAndUpdate(
      { 
        siteId, 
        page, 
        date: new Date().toISOString().split('T')[0] 
      },
      { 
        $inc: { 
          totalSeconds: seconds,
          pageViews: 1
        } 
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating page time stats:', error);
  }
}
```

#### 3. Backend API Update

```javascript
// In backend/controllers/websiteController.js

// Add method to get time on page analytics
exports.getTimeOnPageAnalytics = async (req, res) => {
  try {
    const { siteId, startDate, endDate, page } = req.query;
    
    // Validate request
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }
    
    // Build query
    const query = { siteId };
    
    if (page) {
      query.page = page;
    }
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Get data from database
    const timeStats = await PageTimeStats.find(query).sort({ date: 1 });
    
    // Process data
    const result = timeStats.map(stat => ({
      date: stat.date,
      page: stat.page,
      averageTimeOnPage: stat.pageViews > 0 ? Math.round(stat.totalSeconds / stat.pageViews) : 0,
      totalViews: stat.pageViews
    }));
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching time on page analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### 4. Frontend Update

```jsx
// In client/src/components/TimeOnPageChart.js
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axios from '../axiosInstance';

const TimeOnPageChart = ({ siteId, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/analytics/time-on-page', {
          params: { siteId, startDate, endDate }
        });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching time on page data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [siteId, startDate, endDate]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="chart-container">
      <h3>Average Time on Page</h3>
      <LineChart width={700} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => `${value} seconds`} />
        <Legend />
        <Line type="monotone" dataKey="averageTimeOnPage" stroke="#8884d8" name="Average Time" />
      </LineChart>
    </div>
  );
};

export default TimeOnPageChart;
```

### Integrating with a New Service

#### Steps for Adding a New Integration

1. **Create a new service file** in the appropriate component:
   - For backend integrations: `backend/services/`
   - For client-side integrations: `client/src/services/`

2. **Add API endpoints** for the integration:
   - Create route file(s) in the appropriate routes directory
   - Add controller methods to handle the integration logic

3. **Update the frontend** to utilize the new integration:
   - Add UI components for configuration and display
   - Add Redux actions and reducers if using Redux

#### Example: Adding a Telegram Notification Integration

1. **Backend Service File** (`backend/services/telegramService.js`):

```javascript
const axios = require('axios');

class TelegramService {
  constructor(botToken) {
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }
  
  async sendMessage(chatId, message) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }
  
  async sendAnalyticsAlert(chatId, analyticsData) {
    const message = this.formatAnalyticsMessage(analyticsData);
    return this.sendMessage(chatId, message);
  }
  
  formatAnalyticsMessage(data) {
    return `
<b>Analytics Alert</b>

Site: ${data.siteName}
Time: ${new Date().toISOString()}

<b>Metrics:</b>
- Visitors: ${data.visitors}
- Page Views: ${data.pageViews}
- Conversion Rate: ${data.conversionRate}%

${data.alertReason ? `<b>Alert Reason:</b> ${data.alertReason}` : ''}
    `;
  }
}

module.exports = TelegramService;
```

2. **API Endpoints** (`backend/routes/notificationRouter.js`):

```javascript
const express = require('express');
const router = express.Router();
const TelegramService = require('../services/telegramService');
const auth = require('../middleware/auth');
const Team = require('../models/team');

// Configure Telegram integration
router.post('/telegram/configure', auth, async (req, res) => {
  try {
    const { teamId, botToken, chatId, enabledAlerts } = req.body;
    
    if (!teamId || !botToken || !chatId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Update team settings
    await Team.findByIdAndUpdate(teamId, {
      'notifications.telegram': {
        enabled: true,
        botToken,
        chatId,
        enabledAlerts: enabledAlerts || ['visitors', 'conversions', 'errors']
      }
    });
    
    // Test the integration
    const telegramService = new TelegramService(botToken);
    await telegramService.sendMessage(chatId, 'Cryptique Analytics: Telegram integration configured successfully!');
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error configuring Telegram:', error);
    return res.status(500).json({ error: 'Failed to configure Telegram integration' });
  }
});

// Send test notification
router.post('/telegram/test', auth, async (req, res) => {
  try {
    const { teamId } = req.body;
    
    // Get team settings
    const team = await Team.findById(teamId);
    if (!team || !team.notifications.telegram || !team.notifications.telegram.enabled) {
      return res.status(400).json({ error: 'Telegram integration not configured' });
    }
    
    // Send test message
    const telegramService = new TelegramService(team.notifications.telegram.botToken);
    await telegramService.sendAnalyticsAlert(
      team.notifications.telegram.chatId,
      {
        siteName: 'Test Site',
        visitors: 1234,
        pageViews: 5678,
        conversionRate: 3.45,
        alertReason: 'This is a test alert'
      }
    );
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;
```

3. **Frontend Component** (`client/src/components/TelegramIntegration.js`):

```jsx
import React, { useState } from 'react';
import axios from '../axiosInstance';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Checkbox, 
  FormControlLabel, 
  TextField, 
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';

const TelegramIntegration = ({ teamId }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabledAlerts, setEnabledAlerts] = useState({
    visitors: true,
    conversions: true,
    errors: true
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const alertTypes = Object.keys(enabledAlerts).filter(key => enabledAlerts[key]);
      
      await axios.post('/api/notifications/telegram/configure', {
        teamId,
        botToken,
        chatId,
        enabledAlerts: alertTypes
      });
      
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to configure Telegram integration');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendTest = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/api/notifications/telegram/test', { teamId });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Telegram Integration
        </Typography>
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Telegram integration configured successfully!
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Bot Token"
            fullWidth
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            margin="normal"
            required
            helperText="Create a bot with @BotFather on Telegram to get a token"
          />
          
          <TextField
            label="Chat ID"
            fullWidth
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            margin="normal"
            required
            helperText="The chat ID where notifications will be sent"
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Alert Types
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledAlerts.visitors}
                  onChange={(e) => setEnabledAlerts({...enabledAlerts, visitors: e.target.checked})}
                />
              }
              label="Visitor Spikes"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledAlerts.conversions}
                  onChange={(e) => setEnabledAlerts({...enabledAlerts, conversions: e.target.checked})}
                />
              }
              label="Conversion Changes"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabledAlerts.errors}
                  onChange={(e) => setEnabledAlerts({...enabledAlerts, errors: e.target.checked})}
                />
              }
              label="Error Alerts"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Configuration'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleSendTest}
              disabled={loading || (!botToken && !success)}
            >
              Send Test Notification
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default TelegramIntegration;
```

## Best Practices

### Security Best Practices

- Always validate and sanitize user input
- Use parameterized queries for database operations
- Follow the principle of least privilege
- Use HTTPS for all communications
- Store sensitive data (like API keys) in environment variables
- Implement rate limiting to prevent abuse

### Performance Optimization

- Use pagination for large data sets
- Implement caching for frequently accessed data
- Use database indexes appropriately
- Optimize database queries
- Use server-side filtering and aggregation
- Implement efficient frontend rendering

### Code Organization

- Keep related functionality together
- Use meaningful variable and function names
- Write clear comments and documentation
- Follow the Single Responsibility Principle
- Create reusable components and utilities
- Use consistent error handling patterns

## Troubleshooting

### Common Issues

1. **Connection to MongoDB fails**
   - Check MongoDB connection string
   - Verify network connectivity
   - Ensure MongoDB service is running

2. **API endpoints return 401 Unauthorized**
   - Check authentication token
   - Verify user permissions
   - Check token expiration

3. **Frontend fails to load data**
   - Check browser console for errors
   - Verify API endpoint URLs
   - Check network requests in browser dev tools

### Debugging Tools

- Use `console.log()` for basic debugging
- Utilize browser developer tools for frontend issues
- Use Postman or similar tools to test API endpoints
- Check server logs for backend issues

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)

## Contributing Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Write tests for your changes
5. Run tests to ensure everything passes
6. Commit your changes (`git commit -am 'Add some feature'`)
7. Push to the branch (`git push origin feature/your-feature-name`)
8. Create a new Pull Request 