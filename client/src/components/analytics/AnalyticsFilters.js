import React from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format, startOfDay, endOfDay } from 'date-fns';
import './AnalyticsFilters.css';

export const AnalyticsFilters = ({ 
  filters, 
  onFilterChange, 
  availableOptions,
  pageType = 'dashboard' // 'dashboard', 'traffic', 'geo', 'retention'
}) => {
  const handleDateRangeChange = (ranges) => {
    const { startDate, endDate } = ranges.selection;
    onFilterChange({
      ...filters,
      dateRange: {
        startDate: startOfDay(new Date(startDate)).toISOString(),
        endDate: endOfDay(new Date(endDate)).toISOString(),
        key: 'selection'
      }
    });
  };

  const handleTimeframeChange = (e) => {
    onFilterChange({
      ...filters,
      timeframe: e.target.value
    });
  };

  const handleCountriesChange = (e) => {
    const selectedCountries = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({
      ...filters,
      countries: selectedCountries
    });
  };

  const handleSourcesChange = (e) => {
    const selectedSources = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({
      ...filters,
      sources: selectedSources
    });
  };

  const handleChainsChange = (e) => {
    const selectedChains = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({
      ...filters,
      chains: selectedChains
    });
  };

  const handleRegionsChange = (e) => {
    const selectedRegions = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({
      ...filters,
      regions: selectedRegions
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
          ranges={[{
            startDate: filters.dateRange?.startDate ? new Date(filters.dateRange.startDate) : new Date(),
            endDate: filters.dateRange?.endDate ? new Date(filters.dateRange.endDate) : new Date(),
            key: 'selection'
          }]}
          onChange={handleDateRangeChange}
          months={1}
          direction="horizontal"
          showSelectionPreview={true}
          moveRangeOnFirstSelection={false}
          showDateDisplay={true}
          rangeColors={['#3ecf8e']}
          showMonthAndYearPickers={true}
          editableDateInputs={true}
          locale={{
            format: 'MM/DD/YYYY',
            separator: ' - ',
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            fromLabel: 'From',
            toLabel: 'To',
            customRangeLabel: 'Custom',
            weekLabel: 'W',
            daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            firstDay: 0
          }}
        />
      </div>

      <div className="filter-section">
        <h3>Timeframe</h3>
        <select
          value={filters.timeframe || ''}
          onChange={handleTimeframeChange}
          className="filter-select"
        >
          <option value="">Select Timeframe</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>

      {availableOptions.countries?.length > 0 && (
        <div className="filter-section">
          <h3>Countries</h3>
          <select
            multiple
            value={filters.countries || []}
            onChange={handleCountriesChange}
            className="filter-select"
          >
            {availableOptions.countries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableOptions.sources?.length > 0 && (
        <div className="filter-section">
          <h3>Sources</h3>
          <select
            multiple
            value={filters.sources || []}
            onChange={handleSourcesChange}
            className="filter-select"
          >
            {availableOptions.sources.map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableOptions.chains?.length > 0 && (
        <div className="filter-section">
          <h3>Chains</h3>
          <select
            multiple
            value={filters.chains || []}
            onChange={handleChainsChange}
            className="filter-select"
          >
            {availableOptions.chains.map(chain => (
              <option key={chain} value={chain}>
                {chain}
              </option>
            ))}
          </select>
        </div>
      )}

      {availableOptions.regions?.length > 0 && (
        <div className="filter-section">
          <h3>Regions</h3>
          <select
            multiple
            value={filters.regions || []}
            onChange={handleRegionsChange}
            className="filter-select"
          >
            {availableOptions.regions.map(region => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}

      {pageType !== 'retention' && renderFilterSection('User Types', 'userTypes', ['Unique Visitors', 'Returning Visitors', 'Web3 Users'])}
      
      {pageType === 'retention' && renderFilterSection('Cohort Type', 'cohortType', ['Daily', 'Weekly', 'Monthly'], false)}
      
      {pageType === 'retention' && renderFilterSection('Metric', 'metric', ['DAU', 'WAU', 'MAU'], false)}
    </div>
  );
};

export default AnalyticsFilters; 