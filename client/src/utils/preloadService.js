import axiosInstance from '../axiosInstance';

/**
 * Preloads important dropdown data when a user logs in
 * This improves the user experience by fetching frequently used data ahead of time
 * @param {boolean} forceRefresh - Whether to force a refresh of the data even if already cached
 */
const preloadData = async (forceRefresh = false) => {
  try {
    const selectedTeam = localStorage.getItem("selectedTeam");
    if (!selectedTeam) {
      console.log("No team selected, skipping preload");
      return;
    }

    console.log("Preloading website and contract data for team:", selectedTeam);
    
    // Fetch websites and smart contracts in parallel
    const [websites, contracts] = await Promise.all([
      preloadWebsites(selectedTeam, forceRefresh),
      preloadSmartContracts(selectedTeam, forceRefresh)
    ]);
    
    console.log("Preloading completed");
    return { websites, contracts };
  } catch (error) {
    console.error("Error preloading data:", error);
    throw error;
  }
};

/**
 * Preloads website data for the selected team
 * @param {string} teamId - The team ID to load data for
 * @param {boolean} forceRefresh - Whether to force a refresh of the data
 */
const preloadWebsites = async (teamId, forceRefresh = false) => {
  try {
    // Check sessionStorage first
    const cachedData = sessionStorage.getItem("preloadedWebsites");
    
    // If we have cached data and don't need to force refresh, use it
    if (cachedData && !forceRefresh) {
      const websites = JSON.parse(cachedData);
      console.log(`Using ${websites.length} cached websites from sessionStorage`);
      return websites;
    }
    
    console.log("Preloading websites for team:", teamId);
    const response = await axiosInstance.get(`/website/team/${teamId}`);
    
    if (response.status === 200 && response.data.websites) {
      console.log(`Successfully preloaded ${response.data.websites.length} websites`);
      
      // Store in sessionStorage for quick access
      sessionStorage.setItem("preloadedWebsites", JSON.stringify(response.data.websites));
      
      // If no website is selected already, select the first one
      if (!localStorage.getItem("selectedWebsite") && response.data.websites.length > 0) {
        const firstWebsite = response.data.websites[0];
        localStorage.setItem("idy", firstWebsite.siteId);
        localStorage.setItem("selectedWebsite", firstWebsite.Domain);
      }
      
      return response.data.websites;
    }
    
    return [];
  } catch (error) {
    console.error("Error preloading websites:", error);
    return [];
  }
};

/**
 * Preloads smart contract data for the selected team
 * @param {string} teamId - The team ID to load data for
 * @param {boolean} forceRefresh - Whether to force a refresh of the data
 */
const preloadSmartContracts = async (teamId, forceRefresh = false) => {
  try {
    // Check sessionStorage first
    const cachedData = sessionStorage.getItem("preloadedContracts");
    
    // If we have cached data and don't need to force refresh, use it
    if (cachedData && !forceRefresh) {
      const contracts = JSON.parse(cachedData);
      console.log(`Using ${contracts.length} cached contracts from sessionStorage`);
      return contracts;
    }
    
    console.log("Preloading smart contracts for team:", teamId);
    const response = await axiosInstance.get(`/contracts/team/${teamId}`);
    
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
      
      console.log(`Successfully preloaded ${contracts.length} contracts`);
      return contracts;
    }
    
    return [];
  } catch (error) {
    console.error("Error preloading contracts:", error);
    return [];
  }
};

export default preloadData; 