import axiosInstance from '../axiosInstance';

// Add utility for exponential backoff
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to make API requests with exponential backoff retry
 * @param {Function} apiCall - Function that returns a promise for the API call
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialBackoff - Initial backoff time in ms
 */
const fetchWithRetry = async (apiCall, maxRetries = 3, initialBackoff = 1000) => {
  let retries = 0;
  let lastError;

  while (retries <= maxRetries) {
    try {
      // If not the first attempt, wait with exponential backoff
      if (retries > 0) {
        const backoffTime = initialBackoff * Math.pow(2, retries - 1);
        console.log(`Retry attempt ${retries}/${maxRetries}, waiting ${backoffTime}ms...`);
        await sleep(backoffTime);
      }

      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // If rate limited (429), we definitely want to retry
      if (error.response && error.response.status === 429) {
        console.log(`Rate limited (429), will retry after backoff`);
        retries++;
        continue;
      }
      
      // For other errors, only retry on network errors or 5xx server errors
      if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
        retries++;
        continue;
      }
      
      // For 4xx errors other than 429, don't retry
      throw error;
    }
  }
  
  // If we've exhausted all retries
  console.error(`Failed after ${maxRetries} retries`, lastError);
  throw lastError;
};

/**
 * Preloads important dropdown data when a user logs in
 * This improves the user experience by fetching frequently used data ahead of time
 * @param {boolean} forceRefresh - Whether to force refresh all data even if cached
 * @param {string} teamId - Optional team ID to load data for (defaults to selectedTeam from localStorage)
 */
const preloadData = async (forceRefresh = false, teamId = null) => {
  try {
    const selectedTeam = teamId || localStorage.getItem("selectedTeam");
    if (!selectedTeam) {
      console.log("No team selected, skipping preload");
      return;
    }

    console.log("Preloading website and contract data for team:", selectedTeam);
    
    // If forceRefresh is true, clear existing cached data
    if (forceRefresh) {
      console.log("Force refresh requested, clearing existing data");
      sessionStorage.removeItem("preloadedWebsites");
      sessionStorage.removeItem("preloadedContracts");
    }
    
    // Fetch websites and smart contracts in parallel
    await Promise.all([
      preloadWebsites(selectedTeam),
      preloadSmartContracts(selectedTeam)
    ]);
    
    console.log("Preloading completed");
  } catch (error) {
    console.error("Error preloading data:", error);
  }
};

/**
 * Preloads website data for the selected team
 */
const preloadWebsites = async (teamId) => {
  try {
    // Check if we have cached data and it's not too old (less than 5 minutes old)
    const cachedData = sessionStorage.getItem("preloadedWebsites");
    const lastFetch = sessionStorage.getItem("websitesLastFetch");
    
    if (cachedData && lastFetch) {
      const cacheAge = Date.now() - parseInt(lastFetch);
      // If cache is less than 5 minutes old, use it
      if (cacheAge < 5 * 60 * 1000) {
        console.log("Using cached website data (less than 5 minutes old)");
        return JSON.parse(cachedData);
      }
    }
    
    console.log("Preloading websites for team:", teamId);
    
    // Use the retry logic for the API call
    const response = await fetchWithRetry(
      () => axiosInstance.get(`/website/team/${teamId}`)
    );
    
    if (response.status === 200 && response.data.websites) {
      console.log(`Successfully preloaded ${response.data.websites.length} websites`);
      
      // Store in sessionStorage for quick access
      sessionStorage.setItem("preloadedWebsites", JSON.stringify(response.data.websites));
      sessionStorage.setItem("websitesLastFetch", Date.now().toString());
      
      // If no website is selected already, select the first one
      if (!localStorage.getItem("selectedWebsite") && response.data.websites.length > 0) {
        const firstWebsite = response.data.websites[0];
        localStorage.setItem("idy", firstWebsite.siteId);
        localStorage.setItem("selectedWebsite", firstWebsite.Domain);
      }
      
      return response.data.websites;
    }
  } catch (error) {
    console.error("Error preloading websites:", error);
    return [];
  }
};

/**
 * Preloads smart contract data for the selected team
 */
const preloadSmartContracts = async (teamId) => {
  try {
    // Check if we have cached data and it's not too old (less than 5 minutes old)
    const cachedData = sessionStorage.getItem("preloadedContracts");
    const lastFetch = sessionStorage.getItem("contractsLastFetch");
    
    if (cachedData && lastFetch) {
      const cacheAge = Date.now() - parseInt(lastFetch);
      // If cache is less than 5 minutes old, use it
      if (cacheAge < 5 * 60 * 1000) {
        console.log("Using cached contract data (less than 5 minutes old)");
        return JSON.parse(cachedData);
      }
    }
    
    console.log("Preloading smart contracts for team:", teamId);
    
    // Use the retry logic for the API call
    const response = await fetchWithRetry(
      () => axiosInstance.get(`/contracts/team/${teamId}`)
    );
    
    if (response.data && response.data.contracts) {
      // Format contract data
      const contracts = response.data.contracts.map(contract => ({
        id: contract.contractId,
        address: contract.address,
        name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
        blockchain: contract.blockchain,
        tokenSymbol: contract.tokenSymbol
      }));
      
      // Store in sessionStorage for quick access
      sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
      sessionStorage.setItem("contractsLastFetch", Date.now().toString());
      
      console.log(`Successfully preloaded ${contracts.length} contracts`);
      return contracts;
    }
  } catch (error) {
    console.error("Error preloading contracts:", error);
    return [];
  }
};

export default preloadData; 