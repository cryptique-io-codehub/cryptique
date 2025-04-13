import React, { useState, useEffect } from 'react';
import { 
  format, 
  isWithinInterval, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths, 
  addYears, 
  subYears,
  parseISO,
  startOfDay,
  endOfDay
} from 'date-fns';
import { fetchGeoData } from '../../../services/analyticsService';
import { filterAnalyticsData } from '../../../utils/analyticsFilters';
import AnalyticsFilters from '../../../components/analytics/AnalyticsFilters';
import './GeoAnalytics.css';

const GeoAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
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
  });
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize with proper Date objects
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: thirtyDaysAgo,
      endDate: today,
      key: 'selection'
    },
    timeframe: 'Monthly',
    countries: [],
    sources: [],
    chains: [],
    regions: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Format dates for API call
        const apiFilters = {
          ...filters,
          dateRange: {
            ...filters.dateRange,
            startDate: new Date(filters.dateRange.startDate).toISOString(),
            endDate: new Date(filters.dateRange.endDate).toISOString()
          }
        };
        
        const data = await fetchGeoData(apiFilters);
        setAnalyticsData(data);
        
        // Only filter if we have actual data
        if (data.data && data.data.length > 0) {
          const filtered = filterAnalyticsData(data.data, filters);
          setFilteredData(filtered);
        } else {
          setFilteredData([]);
        }
      } catch (error) {
        console.error('Error loading geo data:', error);
        setError('Failed to load geo data. The analytics service is currently unavailable.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    // Ensure dates are proper Date objects
    if (newFilters.dateRange) {
      newFilters.dateRange.startDate = new Date(newFilters.dateRange.startDate);
      newFilters.dateRange.endDate = new Date(newFilters.dateRange.endDate);
    }
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">
          <h3>Service Unavailable</h3>
          <p>{error}</p>
          <p>Please try again later or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geo-analytics">
      <h1>Geo Analytics</h1>
      <AnalyticsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        availableOptions={{
          countries: analyticsData.countries || [],
          sources: analyticsData.sources || [],
          chains: analyticsData.chains || [],
          regions: analyticsData.regions || []
        }}
        pageType="geo"
      />
      <div className="analytics-content">
        {filteredData.length === 0 ? (
          <div className="no-data">
            <h3>No Data Available</h3>
            <p>There is no analytics data available for the selected time period.</p>
            <p>Please try adjusting your filters or try again later.</p>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Total Visitors</h3>
                <p>{analyticsData.metrics.totalVisitors}</p>
              </div>
              <div className="metric-card">
                <h3>Unique Visitors</h3>
                <p>{analyticsData.metrics.uniqueVisitors}</p>
              </div>
              <div className="metric-card">
                <h3>Web3 Users</h3>
                <p>{analyticsData.metrics.web3Users}</p>
              </div>
              <div className="metric-card">
                <h3>Avg. Session Duration</h3>
                <p>{analyticsData.metrics.averageSessionDuration}s</p>
              </div>
            </div>
            {/* Add your charts and tables here */}
          </>
        )}
      </div>
    </div>
  );
};

export default GeoAnalytics; 