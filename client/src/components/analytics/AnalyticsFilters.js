import React from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './AnalyticsFilters.css';

const AnalyticsFilters = ({ filters, onFilterChange, availableOptions }) => {
  const handleDateRangeChange = (ranges) => {
    onFilterChange({
      ...filters,
      dateRange: ranges.selection
    });
  };

  const handleMultiSelectChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="analytics-filters">
      <div className="filter-section">
        <h3>Date Range</h3>
        <DateRangePicker
          ranges={[filters.dateRange || {
            startDate: new Date(),
            endDate: new Date(),
            key: 'selection'
          }]}
          onChange={handleDateRangeChange}
        />
      </div>

      <div className="filter-section">
        <h3>Countries</h3>
        <select
          multiple
          value={filters.countries}
          onChange={(e) => handleMultiSelectChange('countries', Array.from(e.target.selectedOptions, option => option.value))}
        >
          {availableOptions.countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <h3>User Types</h3>
        <select
          multiple
          value={filters.userTypes}
          onChange={(e) => handleMultiSelectChange('userTypes', Array.from(e.target.selectedOptions, option => option.value))}
        >
          {availableOptions.userTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <h3>Sources</h3>
        <select
          multiple
          value={filters.sources}
          onChange={(e) => handleMultiSelectChange('sources', Array.from(e.target.selectedOptions, option => option.value))}
        >
          {availableOptions.sources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <h3>Chains</h3>
        <select
          multiple
          value={filters.chains}
          onChange={(e) => handleMultiSelectChange('chains', Array.from(e.target.selectedOptions, option => option.value))}
        >
          {availableOptions.chains.map(chain => (
            <option key={chain} value={chain}>{chain}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AnalyticsFilters; 