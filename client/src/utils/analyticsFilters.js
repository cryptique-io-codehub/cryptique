export const filterAnalyticsData = (data, filters) => {
  if (!data || !filters) return data;

  const { dateRange, countries, userTypes, sources, chains } = filters;

  // Filter by date range
  let filteredData = filterByDateRange(data, dateRange);

  // Filter by countries
  if (countries.length > 0) {
    filteredData = filteredData.filter(item => 
      countries.includes(item.country)
    );
  }

  // Filter by user types
  if (userTypes.length > 0) {
    filteredData = filteredData.filter(item => {
      if (userTypes.includes('uniqueVisitors') && item.isUniqueVisitor) return true;
      if (userTypes.includes('web3Users') && item.isWeb3User) return true;
      if (userTypes.includes('walletsConnected') && item.hasWallet) return true;
      return false;
    });
  }

  // Filter by sources
  if (sources.length > 0) {
    filteredData = filteredData.filter(item => 
      sources.includes(item.source)
    );
  }

  // Filter by chains
  if (chains.length > 0) {
    filteredData = filteredData.filter(item => 
      chains.includes(item.chain)
    );
  }

  return filteredData;
};

const filterByDateRange = (data, dateRange) => {
  if (!dateRange) return data;

  const now = new Date();
  let startDate, endDate;

  if (dateRange.type === 'predefined') {
    switch (dateRange.predefined) {
      case 'last7days':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last30days':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last3months':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last1year':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      default:
        return data;
    }
  } else {
    startDate = dateRange.custom.start;
    endDate = dateRange.custom.end;
  }

  return data.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

export const getAvailableOptions = (data) => {
  if (!data) return {
    countries: [],
    sources: [],
    chains: []
  };

  const countries = new Set();
  const sources = new Set();
  const chains = new Set();

  data.forEach(item => {
    if (item.country) countries.add(item.country);
    if (item.source) sources.add(item.source);
    if (item.chain) chains.add(item.chain);
  });

  return {
    countries: Array.from(countries).sort(),
    sources: Array.from(sources).sort(),
    chains: Array.from(chains).sort()
  };
}; 