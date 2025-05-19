import axiosInstance from '../axiosInstance';

/**
 * Preloads important dropdown data when a user logs in
 * This improves the user experience by fetching frequently used data ahead of time
 * @param {boolean} forceRefresh - Whether to force refresh all data even if cached
 * @param {string} teamId - Optional team ID to load data for (defaults to selectedTeam from localStorage)
 * @param {function} setLoadingCallback - Optional callback to handle loading state (receives true/false)
 */
const preloadData = async (forceRefresh = false, teamId = null, setLoadingCallback = null) => {
  try {
    // Set global loading state
    if (setLoadingCallback) {
      setLoadingCallback(true);
    }
    
    // Dispatch a global loading event
    window.dispatchEvent(new CustomEvent('globalDataLoading', { 
      detail: { isLoading: true, source: 'preloadData' }
    }));
    
    const selectedTeam = teamId || localStorage.getItem("selectedTeam");
    if (!selectedTeam) {
      console.log("No team selected, skipping preload");
      
      // Reset loading states
      if (setLoadingCallback) {
        setLoadingCallback(false);
      }
      window.dispatchEvent(new CustomEvent('globalDataLoading', { 
        detail: { isLoading: false, source: 'preloadData' }
      }));
      return;
    }

    console.log("Preloading website and contract data for team:", selectedTeam);
    
    // Check if we've recently refreshed (within 10 seconds) to avoid rate limiting
    const now = Date.now();
    const lastPreloadTime = parseInt(sessionStorage.getItem("lastPreloadTime") || "0");
    
    if (!forceRefresh && now - lastPreloadTime < 10000) {
      console.log("Preload throttled - too recent. Using existing data.");
      
      // Reset loading states
      if (setLoadingCallback) {
        setLoadingCallback(false);
      }
      window.dispatchEvent(new CustomEvent('globalDataLoading', { 
        detail: { isLoading: false, source: 'preloadData' }
      }));
      return;
    }
    
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
    
    // Update last preload time
    sessionStorage.setItem("lastPreloadTime", now.toString());
    console.log("Preloading completed");
  } catch (error) {
    console.error("Error preloading data:", error);
  } finally {
    // Always reset loading states in finally block
    if (setLoadingCallback) {
      setLoadingCallback(false);
    }
    window.dispatchEvent(new CustomEvent('globalDataLoading', { 
      detail: { isLoading: false, source: 'preloadData' }
    }));
  }
};

/**
 * Preloads website data for the selected team
 */
const preloadWebsites = async (teamId) => {
  try {
    console.log("Preloading websites for team:", teamId);
    
    // Check if we have cached websites and aren't forcing a refresh
    const cachedWebsites = sessionStorage.getItem("preloadedWebsites");
    const lastWebsitesRefreshTime = parseInt(sessionStorage.getItem("lastWebsitesRefreshTime") || "0");
    const now = Date.now();
    
    // If we have cached data and it's less than 5 minutes old, use it
    if (cachedWebsites && now - lastWebsitesRefreshTime < 300000) {
      console.log("Using cached website data (< 5 minutes old)");
      return JSON.parse(cachedWebsites);
    }
    
    const response = await axiosInstance.get(`/website/team/${teamId}`);
    
    if (response.status === 200 && response.data.websites) {
      console.log(`Successfully preloaded ${response.data.websites.length} websites`);
      
      // Store in sessionStorage for quick access
      sessionStorage.setItem("preloadedWebsites", JSON.stringify(response.data.websites));
      sessionStorage.setItem("lastWebsitesRefreshTime", now.toString());
      
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
    console.log("Preloading smart contracts for team:", teamId);
    
    // Check if we have cached contracts and aren't forcing a refresh
    const cachedContracts = sessionStorage.getItem("preloadedContracts");
    const lastContractsRefreshTime = parseInt(sessionStorage.getItem("lastContractsRefreshTime") || "0");
    const now = Date.now();
    
    // If we have cached data and it's less than 5 minutes old, use it
    if (cachedContracts && now - lastContractsRefreshTime < 300000) {
      console.log("Using cached contracts data (< 5 minutes old)");
      return JSON.parse(cachedContracts);
    }
    
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
      sessionStorage.setItem("lastContractsRefreshTime", now.toString());
      
      console.log(`Successfully preloaded ${contracts.length} contracts`);
      return contracts;
    }
  } catch (error) {
    console.error("Error preloading contracts:", error);
    return [];
  }
};

export default preloadData; 