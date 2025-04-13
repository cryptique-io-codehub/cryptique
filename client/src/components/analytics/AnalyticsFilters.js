import React from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './AnalyticsFilters.css';

const AnalyticsFilters = ({ 
  filters, 
  onFilterChange, 
  availableOptions,
  pageType = 'dashboard' // 'dashboard', 'traffic', 'geo', 'retention'
}) => {
  const handleDateRangeChange = (ranges) => {
    onFilterChange({
      ...filters,
      dateRange: ranges.selection
    });
  };

  const handleSelectChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const handleMultiSelectChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: Array.from(value)
    });
  };

  const renderFilterSection = (title, field, options, isMulti = true) => (
    <div className="filter-section">
      <h3>{title}</h3>
      {isMulti ? (
        <select
          multiple
          value={filters[field] || []}
          onChange={(e) => handleMultiSelectChange(field, e.target.selectedOptions)}
          className="filter-select"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <select
          value={filters[field] || ''}
          onChange={(e) => handleSelectChange(field, e.target.value)}
          className="filter-select"
        >
          <option value="">All</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}
    </div>
  );

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
          className="date-range-picker"
        />
      </div>

      {renderFilterSection('Timeframe', 'timeframe', ['Daily', 'Weekly', 'Monthly', 'Yearly'], false)}

      {pageType !== 'retention' && renderFilterSection('Countries', 'countries', availableOptions.countries)}
      
      {pageType !== 'retention' && renderFilterSection('Sources', 'sources', availableOptions.sources)}
      
      {pageType !== 'retention' && renderFilterSection('Chains', 'chains', availableOptions.chains)}
      
      {pageType === 'traffic' && renderFilterSection('User Types', 'userTypes', ['Unique Visitors', 'Returning Visitors', 'Web3 Users'])}
      
      {pageType === 'geo' && renderFilterSection('Regions', 'regions', availableOptions.regions)}
      
      {pageType === 'retention' && renderFilterSection('Cohort Type', 'cohortType', ['Daily', 'Weekly', 'Monthly'], false)}
      
      {pageType === 'retention' && renderFilterSection('Metric', 'metric', ['DAU', 'WAU', 'MAU'], false)}
    </div>
  );
};

export default AnalyticsFilters; 