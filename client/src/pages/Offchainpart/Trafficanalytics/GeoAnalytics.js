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
import { enUS } from 'date-fns/locale';
import { fetchGeoData } from '../../../services/analyticsService';
import { filterAnalyticsData } from '../../../utils/analyticsFilters';
import { AnalyticsFilters } from '../../../components/analytics/AnalyticsFilters';
import { getAvailableOptions } from '../../../utils/analyticsFilters';
import './GeoAnalytics.css';

const GeoAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: subMonths(new Date(), 1),
      endDate: new Date(),
      key: 'selection'
    },
    timeframe: 'Monthly',
    country: 'All',
    source: 'All',
    chain: 'All',
    region: 'All'
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
            startDate: format(filters.dateRange.startDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", { locale: enUS }),
            endDate: format(filters.dateRange.endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", { locale: enUS })
          }
        };
        
        const data = await fetchGeoData(apiFilters);
        
        if (!data || !data.data) {
          throw new Error('Invalid data received from server');
        }
        
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
        setFilteredData([]);
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
      <div className="geo-insights">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading geo insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="geo-insights">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geo-insights">
      <h2>Geo Insights</h2>
      <div className="analytics-content">
        <AnalyticsFilters
          filters={filters}
          availableOptions={getAvailableOptions(analyticsData?.data || [])}
          onFilterChange={handleFilterChange}
        />
        
        {filteredData.length > 0 ? (
          <div className="analytics-grid">
            <div className="map-container">
              {/* Map component will go here */}
              <p>Map visualization coming soon</p>
            </div>
            
            <div className="country-list">
              {filteredData.map((country) => (
                <div key={country.country} className="country-card">
                  <h3>{country.country}</h3>
                  <div className="country-metrics">
                    <div className="metric">
                      <span className="label">Visitors</span>
                      <span className="value">{country.visitors}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Sessions</span>
                      <span className="value">{country.sessions}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Avg. Duration</span>
                      <span className="value">{country.avgDuration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-data">
            <p>No geo data available for the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoAnalytics; 