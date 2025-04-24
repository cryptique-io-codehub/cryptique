/**
 * bnbChain.js - Module for handling BNB chain transactions
 * Uses BscScan API as primary source with Infura as fallback
 */

import axios from 'axios';
import { 
  formatTransaction, 
  formatTokenAmount, 
  decodeERC20TransferInput, 
  safeNumber, 
  isValidAddress 
} from '../chainUtils';

// API keys should be in .env file - these are placeholders
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY || 'YourBscScanApiKeyHere';
const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY || 'YourInfuraApiKeyHere';

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;
const BSC_SCAN_TOKEN_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=tokentx`;

// Maximum results per page from BscScan
const MAX_RESULTS_PER_PAGE = 10000;
const DEFAULT_PAGE_SIZE = 100;

/**
 * Fetches transactions for a BNB address or contract
 * Prioritizes BscScan API and falls back to Infura if no results
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.page - Page number for pagination
 * @param {number} options.offset - Number of transactions to skip
 * @param {number} options.limit - Maximum number of transactions to return
 * @param {string} options.startBlock - Starting block number
 * @param {string} options.endBlock - Ending block number
 * @param {string} options.sort - Sort direction ('asc' or 'desc')
 * @param {boolean} options.includeTokenTransfers - Whether to include token transfers
 * @returns {Promise<Object>} - Object containing transactions and metadata
 */
export const fetchBnbTransactions = async (address, options = {}) => {
  // Validate address
  if (!isValidAddress(address)) {
    console.error('Invalid BNB address format:', address);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: 'Invalid address format',
        total: 0,
        page: 1,
        pageSize: 0
      }
    };
  }

  console.log(`Fetching BNB transactions for address: ${address}`);
  
  // Define default options
  const fetchOptions = {
    page: options.page || 1,
    offset: options.offset || 0,
    limit: options.limit || DEFAULT_PAGE_SIZE,
    startBlock: options.startBlock || '0',
    endBlock: options.endBlock || '999999999',
    sort: options.sort || 'desc',
    includeTokenTransfers: options.includeTokenTransfers !== false
  };

  try {
    // First try BscScan API
    const bscScanResult = await fetchFromBscScan(address, fetchOptions);
    
    // If we got results from BscScan, use those
    if (bscScanResult.status === 'success' && bscScanResult.transactions.length > 0) {
      console.log(`Retrieved ${bscScanResult.transactions.length} transactions from BscScan`);
      return bscScanResult;
    }
    
    // If BscScan returned no results, log the result
    console.log('BscScan returned no results or failed:', bscScanResult.message);
    
    // Placeholder for Infura fallback implementation
    console.log('Infura fallback not yet implemented');
    
    // Return BscScan results as fallback doesn't exist yet
    return bscScanResult;
  } catch (error) {
    console.error('Error fetching BNB transactions:', error);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: error.message || 'Unknown error occurred',
        total: 0,
        page: fetchOptions.page,
        pageSize: 0
      }
    };
  }
};

/**
 * Fetches transactions from the BscScan API
 * Handles pagination and adjusts limits to avoid exceeding the result window
 * 
 * @param {string} address - Address to fetch transactions for
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Formatted transaction results
 */
export const fetchFromBscScan = async (address, options) => {
  const { page, limit, startBlock, endBlock, sort, includeTokenTransfers } = options;
  
  try {
    // Calculate adjusted page size to prevent "Result window is too large" error
    // BscScan has a max of 10,000 results total, so adjust page size for later pages
    const adjustedLimit = calculateAdjustedPageSize(page, limit);
    
    // For page > 1, we need to calculate offset
    const offset = (page - 1) * adjustedLimit;
    
    console.log(`Fetching from BscScan with page ${page}, adjustedLimit ${adjustedLimit}`);
    
    // Fetch regular transactions
    const txResponse = await axios.get(BSC_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: startBlock,
        endblock: endBlock,
        page,
        offset: adjustedLimit, // BscScan uses 'offset' as page size
        sort
      }
    });
    
    // Parse the response
    const txResult = txResponse.data;
    
    // Initialize transactions array
    let transactions = [];
    
    // Process regular transactions if successful
    if (txResult.status === '1' && Array.isArray(txResult.result)) {
      // Map the transactions to our standard format
      transactions = txResult.result.map(tx => formatTransaction(tx, 'BNB'));
      
      console.log(`Retrieved ${transactions.length} regular transactions from BscScan`);
    } else {
      console.log('No regular transactions found or API error:', txResult.message);
    }
    
    // If token transfers are requested, fetch and process them
    if (includeTokenTransfers) {
      const tokenTransfers = await fetchTokenTransfersFromBscScan(
        address, 
        { startBlock, endBlock, page, limit: adjustedLimit, sort }
      );
      
      if (tokenTransfers.length > 0) {
        // Add token transfers to the transactions array
        transactions = [...transactions, ...tokenTransfers];
        
        // Sort transactions by block number (descending by default)
        transactions.sort((a, b) => {
          return sort === 'asc' 
            ? a.block_number - b.block_number 
            : b.block_number - a.block_number;
        });
        
        console.log(`Added ${tokenTransfers.length} token transfers, total: ${transactions.length}`);
      }
    }
    
    // Return formatted result
    return {
      transactions,
      metadata: {
        status: transactions.length > 0 ? 'success' : 'no_results',
        message: transactions.length > 0 
          ? 'Transactions retrieved successfully' 
          : 'No transactions found for this address',
        total: txResult.status === '1' ? parseInt(txResult.result.length) : 0,
        page,
        pageSize: adjustedLimit
      }
    };
  } catch (error) {
    console.error('Error fetching from BscScan:', error);
    
    // Provide a more detailed error message
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: `BscScan API error: ${errorMessage}`,
        total: 0,
        page,
        pageSize: 0
      }
    };
  }
};

/**
 * Fetches BEP-20 token transfers from BscScan API
 * 
 * @param {string} address - Address to fetch token transfers for
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - Array of formatted token transfers
 */
export const fetchTokenTransfersFromBscScan = async (address, options) => {
  const { startBlock, endBlock, page, limit, sort } = options;
  
  try {
    console.log(`Fetching token transfers for ${address}`);
    
    const response = await axios.get(BSC_SCAN_TOKEN_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: startBlock,
        endblock: endBlock,
        page,
        offset: limit,
        sort
      }
    });
    
    const result = response.data;
    
    if (result.status === '1' && Array.isArray(result.result)) {
      console.log(`Retrieved ${result.result.length} token transfers from BscScan`);
      
      // Process and format token transfers
      return result.result.map(tx => {
        // Create token data object
        const tokenData = {
          isToken: true,
          name: tx.tokenName || 'Unknown Token',
          symbol: tx.tokenSymbol || 'TOKEN',
          contractAddress: tx.contractAddress,
          value: formatTokenAmount(tx.value, safeNumber(tx.tokenDecimal), tx.tokenSymbol)
        };
        
        // Format the transaction with token data
        return formatTransaction(tx, 'BNB', tokenData);
      });
    } else {
      console.log('No token transfers found or API error:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching token transfers from BscScan:', error);
    return [];
  }
};

/**
 * Calculates an adjusted page size for BscScan API requests
 * to prevent "Result window is too large" errors
 * 
 * @param {number} page - Current page number
 * @param {number} requestedLimit - Requested page size
 * @returns {number} - Adjusted page size
 */
const calculateAdjustedPageSize = (page, requestedLimit) => {
  // For first page, use requested limit
  if (page === 1) {
    return Math.min(requestedLimit, MAX_RESULTS_PER_PAGE);
  }
  
  // Calculate the maximum safe page size based on current page
  // BscScan has a hard limit of 10,000 total results
  const maxSafePageSize = Math.floor(MAX_RESULTS_PER_PAGE / page);
  
  // Use the smaller of the requested limit and the max safe page size
  return Math.min(requestedLimit, maxSafePageSize);
};

/**
 * Gets token details from a contract address
 * Currently implemented to return mock data for testing
 * 
 * @param {string} contractAddress - Token contract address
 * @returns {Promise<Object>} - Token details object
 */
export const getTokenDetails = async (contractAddress) => {
  // This is a placeholder that would normally fetch token details from an API
  // For now, just log that we'd get details and return a mock object
  console.log(`Getting token details for contract: ${contractAddress}`);
  
  // In a real implementation, you would:
  // 1. Check a local cache first
  // 2. If not in cache, fetch from BscScan API or other source
  // 3. Cache the result for future use
  
  // Mock implementation for testing
  return {
    name: 'Unknown Token',
    symbol: 'TOKEN',
    decimals: 18,
    contractAddress
  };
};

export default {
  fetchBnbTransactions,
  fetchFromBscScan,
  fetchTokenTransfersFromBscScan,
  getTokenDetails
}; 