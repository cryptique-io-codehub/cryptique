import React, { useState, useEffect } from 'react';
import { fetchWebsites } from '../../services/analyticsService';
import './Filters.css';

const Filters = ({ onFilterChange, filters }) => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWebsites = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWebsites();
        setWebsites(data);
      } catch (error) {
        console.error('Error fetching websites:', error);
        setError('Failed to load websites. Please try again later.');
        setWebsites([]);
      } finally {
        setLoading(false);
      }
    };

    loadWebsites();
  }, []);

  const handleWebsiteChange = (e) => {
    const newFilters = {
      ...filters,
      website: e.target.value
    };
    onFilterChange(newFilters);
  };

  if (loading) {
    return (
      <div className="filters-loading">
        <div className="loading-spinner"></div>
        <p>Loading websites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="filters-error">
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="website">Website</label>
        <select
          id="website"
          value={filters.website || ''}
          onChange={handleWebsiteChange}
          className="filter-select"
        >
          <option value="">All Websites</option>
          {websites.map(website => (
            <option key={website.id} value={website.id}>
              {website.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filters; 