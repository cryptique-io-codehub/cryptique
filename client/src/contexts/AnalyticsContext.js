import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import sdkApi from '../utils/sdkApi';

// Create the context
const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
  const [analytics, setAnalytics] = useState({});
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const lastRefreshTime = useRef(Date.now() - 60000); // Initialize to 1 minute ago
  const analyticsCache = useRef(new Map()); // Cache analytics data by website ID

  // Function to fetch analytics data for a website
  const fetchAnalyticsData = async (websiteId) => {
    if (!websiteId) {
      console.log("No website ID provided, cannot fetch analytics");
      return null;
    }

    setIsLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      console.log(`Fetching analytics data for website ID: ${websiteId}`);
      const response = await sdkApi.getAnalytics(websiteId);

      if (response.subscriptionError) {
        console.error("Subscription error:", response.message);
        setAnalyticsError(response.message);
        return null;
      }

      if (response && response.analytics) {
        // Cache the analytics data
        analyticsCache.current.set(websiteId, {
          data: response.analytics,
          timestamp: Date.now()
        });

        return response.analytics;
      }

      return null;
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setAnalyticsError("Failed to load analytics data");
      return null;
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Function to get analytics data (from cache or fetch new)
  const getAnalytics = async (websiteId, forceFetch = false) => {
    if (!websiteId) return null;

    const now = Date.now();
    const cached = analyticsCache.current.get(websiteId);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

    // Use cached data if available and not expired
    if (!forceFetch && cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log("Using cached analytics data");
      setAnalytics(cached.data);
      return cached.data;
    }

    // Fetch fresh data
    const freshData = await fetchAnalyticsData(websiteId);
    if (freshData) {
      setAnalytics(freshData);
    }
    return freshData;
  };

  // Listen for website changes
  useEffect(() => {
    let currentWebsiteId = localStorage.getItem("idy");

    const checkWebsiteChange = async () => {
      const newWebsiteId = localStorage.getItem("idy");
      const now = Date.now();

      if (newWebsiteId && newWebsiteId !== currentWebsiteId) {
        console.log(`Website changed from ${currentWebsiteId} to ${newWebsiteId}, refreshing analytics`);
        currentWebsiteId = newWebsiteId;
        lastRefreshTime.current = now;
        await getAnalytics(newWebsiteId, true);
      } else if (newWebsiteId && (now - lastRefreshTime.current > 300000)) {
        // Refresh every 5 minutes
        lastRefreshTime.current = now;
        await getAnalytics(newWebsiteId);
      }
    };

    // Initial load
    if (currentWebsiteId) {
      getAnalytics(currentWebsiteId);
    }

    // Check for changes every 2 seconds
    const intervalId = setInterval(checkWebsiteChange, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        analytics,
        isLoadingAnalytics,
        analyticsError,
        getAnalytics,
        fetchAnalyticsData
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

// Hook to use analytics context
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}; 