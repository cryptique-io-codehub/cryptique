export const filterAnalyticsData = (data, filters) => {
  if (!data || !filters) return data;

  let filteredData = [...data];

  // Filter by date range
  if (filters.dateRange) {
    const { startDate, endDate } = filters.dateRange;
    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  // Filter by timeframe
  if (filters.timeframe) {
    const now = new Date();
    let startDate;
    
    switch (filters.timeframe) {
      case 'Daily':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'Weekly':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'Monthly':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'Yearly':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        break;
    }

    if (startDate) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate;
      });
    }
  }

  // Filter by countries
  if (filters.countries && filters.countries.length > 0) {
    filteredData = filteredData.filter(item => 
      filters.countries.includes(item.country)
    );
  }

  // Filter by sources
  if (filters.sources && filters.sources.length > 0) {
    filteredData = filteredData.filter(item => 
      filters.sources.includes(item.source)
    );
  }

  // Filter by chains
  if (filters.chains && filters.chains.length > 0) {
    filteredData = filteredData.filter(item => 
      filters.chains.includes(item.chain)
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
  if (filters.regions && filters.regions.length > 0) {
    filteredData = filteredData.filter(item => 
      filters.regions.includes(item.region)
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