import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://cryptique-backend.vercel.app';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000 // 10 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const fetchAnalyticsData = async (filters = {}) => {
  try {
    const response = await api.get('/api/analytics/data', {
      params: filters,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 404) {
      console.warn('Analytics endpoint not found, returning empty data structure');
      return {
        sessions: [],
        users: [],
        pageViews: [],
        metrics: {
          totalSessions: 0,
          totalUsers: 0,
          totalPageViews: 0,
          averageSessionDuration: 0,
          bounceRate: 0
        }
      };
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return {
      sessions: [],
      users: [],
      pageViews: [],
      metrics: {
        totalSessions: 0,
        totalUsers: 0,
        totalPageViews: 0,
        averageSessionDuration: 0,
        bounceRate: 0
      }
    };
  }
};

export const fetchTrafficData = async (filters = {}) => {
  try {
    const response = await api.get('/api/analytics/traffic', {
      params: filters,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 404) {
      console.warn('Traffic analytics endpoint not found, returning empty data structure');
      return {
        data: [],
        metrics: {
          totalVisitors: 0,
          uniqueVisitors: 0,
          pageViews: 0,
          averageSessionDuration: 0
        }
      };
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    return {
      data: [],
      metrics: {
        totalVisitors: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        averageSessionDuration: 0
      }
    };
  }
};

export const fetchGeoData = async (filters = {}) => {
  try {
    // Validate date range
    if (filters.dateRange) {
      const { startDate, endDate } = filters.dateRange;
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Invalid date range: start date is after end date');
      }
    }

    // Format parameters for API call
    const params = new URLSearchParams();
    if (filters.dateRange) {
      params.append('dateRange[startDate]', filters.dateRange.startDate);
      params.append('dateRange[endDate]', filters.dateRange.endDate);
      params.append('dateRange[key]', filters.dateRange.key);
    }
    if (filters.timeframe) {
      params.append('timeframe', filters.timeframe);
    }
    if (filters.countries?.length) {
      filters.countries.forEach(country => params.append('countries[]', country));
    }
    if (filters.sources?.length) {
      filters.sources.forEach(source => params.append('sources[]', source));
    }
    if (filters.chains?.length) {
      filters.chains.forEach(chain => params.append('chains[]', chain));
    }
    if (filters.regions?.length) {
      filters.regions.forEach(region => params.append('regions[]', region));
    }

    const response = await api.get('/api/analytics/geo', {
      params,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 404) {
      console.warn('Geo analytics endpoint not found, returning empty data structure');
      return {
        countries: [],
        sources: [],
        chains: [],
        regions: [],
        data: [],
        metrics: {
          totalVisitors: 0,
          uniqueVisitors: 0,
          web3Users: 0,
          averageSessionDuration: 0
        }
      };
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching geo data:', error);
    return {
      countries: [],
      sources: [],
      chains: [],
      regions: [],
      data: [],
      metrics: {
        totalVisitors: 0,
        uniqueVisitors: 0,
        web3Users: 0,
        averageSessionDuration: 0
      }
    };
  }
};

export const fetchRetentionData = async (filters = {}) => {
  try {
    const response = await api.get('/api/analytics/retention', {
      params: filters,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 404) {
      console.warn('Retention analytics endpoint not found, returning empty data structure');
      return {
        data: [],
        metrics: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
          retentionRate: 0
        }
      };
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching retention data:', error);
    return {
      data: [],
      metrics: {
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        retentionRate: 0
      }
    };
  }
};

export const processAnalyticsData = (data, filters) => {
  if (!data || !Array.isArray(data)) {
    return {
      sessions: [],
      users: [],
      pageViews: [],
      metrics: {
        totalSessions: 0,
        totalUsers: 0,
        totalPageViews: 0,
        averageSessionDuration: 0,
        bounceRate: 0
      }
    };
  }

  const { startDate, endDate } = filters;
  const filteredData = data.filter(item => {
    const itemDate = new Date(item.timestamp);
    return (!startDate || itemDate >= new Date(startDate)) &&
           (!endDate || itemDate <= new Date(endDate));
  });

  const sessions = filteredData;
  const users = [...new Set(filteredData.map(item => item.userId))];
  const pageViews = filteredData.reduce((acc, item) => acc + (item.pageViews || 0), 0);
  const totalDuration = filteredData.reduce((acc, item) => acc + (item.duration || 0), 0);
  const bounceSessions = filteredData.filter(item => item.pageViews <= 1).length;

  return {
    sessions,
    users,
    pageViews,
    metrics: {
      totalSessions: sessions.length,
      totalUsers: users.length,
      totalPageViews: pageViews,
      averageSessionDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      bounceRate: sessions.length > 0 ? Math.round((bounceSessions / sessions.length) * 100) : 0
    }
  };
}; 