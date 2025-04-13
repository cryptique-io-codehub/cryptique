import React, { useState, useEffect } from 'react';
import { AnalyticsFilters } from '../../../components/analytics/AnalyticsFilters';
import { filterAnalyticsData, getAvailableOptions } from '../../../utils/analyticsFilters';
import { fetchAnalyticsData } from '../../../services/analyticsService';
import './TrafficAnalytics.css';

const TrafficAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      key: 'selection'
    },
    timeframe: 'Daily',
    countries: [],
    sources: [],
    chains: [],
    userTypes: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchAnalyticsData();
        setAnalyticsData(data);
        setFilteredData(data);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const filtered = filterAnalyticsData(analyticsData, filters);
    setFilteredData(filtered);
  }, [filters, analyticsData]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const availableOptions = getAvailableOptions(analyticsData);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="traffic-analytics">
      <h1>Traffic Analytics</h1>
      
      <AnalyticsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        availableOptions={availableOptions}
        pageType="traffic"
      />

      <div className="analytics-content">
        {/* Your existing analytics components */}
        {/* Update these components to use filteredData instead of analyticsData */}
      </div>
    </div>
  );
};

export default TrafficAnalytics; 