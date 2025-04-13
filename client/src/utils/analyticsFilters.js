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

export const filterAnalyticsData = (data, filters) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  const { dateRange, timeframe, countries, sources, chains, regions } = filters;
  let filteredData = [...data];

  // Apply date range filter
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    const startDate = startOfDay(new Date(dateRange.startDate));
    const endDate = endOfDay(new Date(dateRange.endDate));
    
    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.timestamp);
      return isWithinInterval(itemDate, { start: startDate, end: endDate });
    });
  }

  // Filter by timeframe
  if (timeframe) {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'Daily':
        startDate = subDays(now, 1);
        break;
      case 'Weekly':
        startDate = subDays(now, 7);
        break;
      case 'Monthly':
        startDate = subMonths(now, 1);
        break;
      case 'Yearly':
        startDate = subYears(now, 1);
        break;
      default:
        break;
    }

    if (startDate) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return isWithinInterval(itemDate, { start: startDate, end: now });
      });
    }
  }

  // Filter by countries
  if (countries && countries.length > 0) {
    filteredData = filteredData.filter(item => 
      countries.includes(item.country)
    );
  }

  // Filter by sources
  if (sources && sources.length > 0) {
    filteredData = filteredData.filter(item => 
      sources.includes(item.source)
    );
  }

  // Filter by chains
  if (chains && chains.length > 0) {
    filteredData = filteredData.filter(item => 
      chains.includes(item.chain)
    );
  }

  // Filter by user types
  if (filters.userTypes && filters.userTypes.length > 0) {
    filteredData = filteredData.filter(item => {
      if (filters.userTypes.includes('Unique Visitors') && item.isUniqueVisitor) return true;
      if (filters.userTypes.includes('Returning Visitors') && !item.isUniqueVisitor) return true;
      if (filters.userTypes.includes('Web3 Users') && item.isWeb3User) return true;
      return false;
    });
  }

  // Filter by regions
  if (regions && regions.length > 0) {
    filteredData = filteredData.filter(item => 
      regions.includes(item.region)
    );
  }

  return filteredData;
};

export const getAvailableOptions = (data) => {
  if (!data) return {
    countries: [],
    sources: [],
    chains: [],
    regions: []
  };

  const countries = new Set();
  const sources = new Set();
  const chains = new Set();
  const regions = new Set();

  data.forEach(item => {
    if (item.country) countries.add(item.country);
    if (item.source) sources.add(item.source);
    if (item.chain) chains.add(item.chain);
    if (item.region) regions.add(item.region);
  });

  return {
    countries: Array.from(countries).sort(),
    sources: Array.from(sources).sort(),
    chains: Array.from(chains).sort(),
    regions: Array.from(regions).sort()
  };
}; 