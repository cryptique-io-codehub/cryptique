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
  parseISO
} from 'date-fns';
import { fetchGeoData } from '../../../services/analyticsService';
import { filterAnalyticsData } from '../../../utils/analyticsFilters';
import AnalyticsFilters from '../../../components/analytics/AnalyticsFilters';
import './GeoAnalytics.css';

const GeoAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
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
        const data = await fetchGeoData(filters);
        setAnalyticsData(data);
        const filtered = filterAnalyticsData(data, filters);
        setFilteredData(filtered);
      } catch (error) {
        console.error('Error loading geo data:', error);
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
    return <div className="loading">Loading...</div>;
  }

  if (!filteredData) {
    return <div className="error">No data available</div>;
  }

  return (
    <div className="geo-analytics">
      <h1>Geo Analytics</h1>
      <AnalyticsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        availableOptions={{
          countries: filteredData.countries || [],
          sources: filteredData.sources || [],
          chains: filteredData.chains || [],
          regions: filteredData.regions || []
        }}
        pageType="geo"
      />
      <div className="analytics-content">
        {/* Add your analytics content here */}
      </div>
    </div>
  );
};

export default GeoAnalytics; 