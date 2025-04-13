import React, { useState, useEffect } from 'react';
import { fetchAnalyticsData } from '../../services/analyticsService';
import { AnalyticsFilters } from '../../components/analytics/AnalyticsFilters';
import { getAvailableOptions } from '../../utils/analyticsFilters';
import './OffchainAnalytics.css';

const OffchainAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
      key: 'selection'
    },
    timeframe: 'Daily'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchAnalyticsData(filters);
        
        if (!data) {
          throw new Error('No data received from server');
        }
        
        setAnalyticsData(data);
        setFilteredData(data.sessions || []);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        if (error.message.includes('Network Error') || error.message.includes('CORS')) {
          setError('Unable to connect to the analytics service. Please check your network connection and try again.');
        } else {
          setError('Failed to load analytics data. Please try again later.');
        }
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="offchain-analytics">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="offchain-analytics">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="offchain-analytics">
      <h2>Analytics Dashboard</h2>
      <div className="analytics-content">
        <AnalyticsFilters
          filters={filters}
          availableOptions={getAvailableOptions(analyticsData?.sessions || [])}
          onFilterChange={handleFilterChange}
        />
        
        {filteredData.length > 0 ? (
          <div className="analytics-grid">
            {/* Add your analytics components here */}
          </div>
        ) : (
          <div className="no-data">
            <p>No analytics data available for the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OffchainAnalytics; 