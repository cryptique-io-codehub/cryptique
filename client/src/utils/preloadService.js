import axiosInstance from '../axiosInstance';

/**
 * Main preload function to fetch all necessary data on app startup
 * This will preload websites, contracts, and basic transaction data
 */
const preloadData = async (forceRefresh = false) => {
  try {
    const teamId = localStorage.getItem("selectedTeam");
    if (!teamId) {
      console.log("No team selected, skipping preload");
      return;
    }
    
    console.log(`Starting preload for team: ${teamId}`);
    
    // Load all data in parallel for faster initialization
    const [websites, contracts] = await Promise.all([
      preloadWebsites(teamId, forceRefresh),
      preloadSmartContracts(teamId, forceRefresh)
    ]);
    
    // Once we have contracts, preload basic transaction data for the most recently used contracts
    if (contracts && contracts.length > 0) {
      // Try to get the currently selected contract
      const selectedContractId = localStorage.getItem("selectedContractId");
      
      // If there's a selected contract, prioritize that one for preloading
      if (selectedContractId) {
        console.log(`Preloading transactions for previously selected contract: ${selectedContractId}`);
        preloadContractTransactions(selectedContractId);
      } else if (contracts.length > 0) {
        // Otherwise preload the first contract
        console.log(`No previously selected contract, preloading first contract: ${contracts[0].id}`);
        preloadContractTransactions(contracts[0].id);
      }
      
      // In the background, also preload the rest of the top 3 contracts
      setTimeout(() => {
        const contractsToPreload = contracts.slice(0, 3).filter(c => c.id !== selectedContractId);
        
        console.log(`Background preloading ${contractsToPreload.length} additional contracts`);
        contractsToPreload.forEach(contract => {
          preloadContractTransactions(contract.id);
        });
      }, 2000); // Delay to avoid overwhelming API
    }
    
    return { websites, contracts };
  } catch (error) {
    console.error("Error in preload service:", error);
    return { websites: [], contracts: [] };
  }
};

/**
 * Preload transaction data for a specific contract
 */
const preloadContractTransactions = async (contractId) => {
  if (!contractId) return [];
  
  try {
    console.log(`Preloading transactions for contract: ${contractId}`);
    
    // Check if we have cached data and it's recent (last 30 minutes)
    const cachedDataKey = `contract_transactions_${contractId}`;
    const lastRefreshKey = `contract_transactions_refresh_${contractId}`;
    const lastRefreshTime = parseInt(localStorage.getItem(lastRefreshKey) || "0");
    const now = Date.now();
    
    // If we have recently cached data, don't fetch again
    if (now - lastRefreshTime < 30 * 60 * 1000) { // 30 minutes
      const cachedData = localStorage.getItem(cachedDataKey);
      if (cachedData) {
        console.log(`Using cached transaction data for contract ${contractId} (< 30 minutes old)`);
        return JSON.parse(cachedData);
      }
    }
    
    // Fetch first batch of transactions only (for speed)
    const response = await axiosInstance.get(`/transactions/contract/${contractId}`, {
      params: { 
        limit: 5000,
        page: 1
      }
    });
    
    if (response.data && response.data.transactions) {
      const transactions = response.data.transactions;
      console.log(`Preloaded ${transactions.length} transactions for contract ${contractId}`);
      
      // Cache the transactions
      localStorage.setItem(cachedDataKey, JSON.stringify(transactions));
      localStorage.setItem(lastRefreshKey, now.toString());
      
      return transactions;
    }
    
    return [];
  } catch (error) {
    console.error(`Error preloading transactions for contract ${contractId}:`, error);
    return [];
  }
};

/**
 * Preloads website data for the selected team
 */
const preloadWebsites = async (teamId, forceRefresh = false) => {
  try {
    console.log("Preloading websites for team:", teamId);
    
    // Check if we have cached websites and aren't forcing a refresh
    const cachedWebsites = sessionStorage.getItem("preloadedWebsites");
    const lastWebsitesRefreshTime = parseInt(sessionStorage.getItem("lastWebsitesRefreshTime") || "0");
    const now = Date.now();
    
    // If we have cached data, it's less than 5 minutes old, and we're not forcing refresh, use it
    if (cachedWebsites && now - lastWebsitesRefreshTime < 300000 && !forceRefresh) {
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
    
    return [];
  } catch (error) {
    console.error("Error preloading websites:", error);
    return [];
  }
};

/**
 * Preloads smart contract data for the selected team
 */
const preloadSmartContracts = async (teamId, forceRefresh = false) => {
  try {
    console.log("Preloading smart contracts for team:", teamId);
    
    // Check if we have cached contracts and aren't forcing a refresh
    const cachedContracts = sessionStorage.getItem("preloadedContracts");
    const lastContractsRefreshTime = parseInt(sessionStorage.getItem("lastContractsRefreshTime") || "0");
    const now = Date.now();
    
    // If we have cached data, it's less than 5 minutes old, and we're not forcing refresh, use it
    if (cachedContracts && now - lastContractsRefreshTime < 300000 && !forceRefresh) {
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
    
    return [];
  } catch (error) {
    console.error("Error preloading contracts:", error);
    return [];
  }
};

export default preloadData; 