import axiosInstance from '../axiosInstance';

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
  } catch (error) {
    console.error("Error preloading contracts:", error);
    return [];
  }
};

export default preloadData; 