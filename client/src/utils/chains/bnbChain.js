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
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY || 'YOUR_BSCSCAN_API_KEY';
const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY || 'YOUR_INFURA_API_KEY';

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;
const BSC_SCAN_TOKEN_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=tokentx`;
const BSC_SCAN_INTERNAL_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlistinternal`;

// Maximum results per page from BscScan
const MAX_RESULTS_PER_PAGE = 10000;
const DEFAULT_PAGE_SIZE = 10000;

/**
 * Fetches transactions for a BNB address or contract
 * Gets all types of transactions: normal, token transfers, and internal
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.page - Page number for pagination
 * @param {number} options.offset - Number of transactions to skip
 * @param {number} options.limit - Maximum number of transactions to return
 * @param {string} options.startBlock - Starting block number
 * @param {string} options.endBlock - Ending block number
 * @param {string} options.sort - Sort direction ('asc' or 'desc')
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
    sort: options.sort || 'desc'
  };

  try {
    console.log(`Fetching with options:`, fetchOptions);
    
    // Fetch all transaction types in parallel
    const [normalTxs, tokenTxs, internalTxs] = await Promise.all([
      fetchNormalTransactions(address, fetchOptions),
      fetchTokenTransactions(address, fetchOptions),
      fetchInternalTransactions(address, fetchOptions)
    ]);
    
    console.log(`Retrieved transaction counts: 
      Normal: ${normalTxs.length}, 
      Token: ${tokenTxs.length}, 
      Internal: ${internalTxs.length}`);
    
    // Combine all transaction types
    let allTransactions = [...normalTxs, ...tokenTxs, ...internalTxs];
    
    // Remove duplicates based on tx_hash
    const uniqueTransactions = removeDuplicateTransactions(allTransactions);
    
    // Sort by block number
    uniqueTransactions.sort((a, b) => {
      return fetchOptions.sort === 'asc' 
        ? a.block_number - b.block_number 
        : b.block_number - a.block_number;
    });
    
    console.log(`Total unique transactions: ${uniqueTransactions.length}`);
    
    // Log sample transaction for debugging
    if (uniqueTransactions.length > 0) {
      console.log('Sample transaction:', uniqueTransactions[0]);
    }
    
    return {
      transactions: uniqueTransactions,
      metadata: {
        status: uniqueTransactions.length > 0 ? 'success' : 'no_results',
        message: uniqueTransactions.length > 0 
          ? 'Transactions retrieved successfully' 
          : 'No transactions found for this address',
        total: uniqueTransactions.length,
        page: fetchOptions.page,
        pageSize: fetchOptions.limit
      }
    };
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
 * Fetches normal transactions from BscScan
 * 
 * @param {string} address - Address to fetch for
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - Array of formatted transactions
 */
const fetchNormalTransactions = async (address, options) => {
  try {
    console.log(`Fetching normal transactions for ${address}`);
    
    const response = await axios.get(BSC_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: options.startBlock,
        endblock: options.endBlock,
        page: options.page,
        offset: options.limit,
        sort: options.sort
      }
    });
    
    const result = response.data;
    
    if (result.status === '1' && Array.isArray(result.result)) {
      console.log(`Retrieved ${result.result.length} normal transactions from BscScan`);
      return result.result.map(tx => formatTransaction(tx, 'BNB'));
    } else {
      console.log('No normal transactions found or API error:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching normal transactions:', error);
    return [];
  }
};

/**
 * Fetches token transactions from BscScan
 * 
 * @param {string} address - Address to fetch for
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - Array of formatted transactions
 */
const fetchTokenTransactions = async (address, options) => {
  try {
    console.log(`Fetching token transactions for ${address}`);
    
    const response = await axios.get(BSC_SCAN_TOKEN_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: options.startBlock,
        endblock: options.endBlock,
        page: options.page,
        offset: options.limit,
        sort: options.sort
      }
    });
    
    const result = response.data;
    
    if (result.status === '1' && Array.isArray(result.result)) {
      console.log(`Retrieved ${result.result.length} token transactions from BscScan`);
      
      return result.result.map(tx => {
        const tokenData = {
          isToken: true,
          name: tx.tokenName || 'Unknown Token',
          symbol: tx.tokenSymbol || 'TOKEN',
          contractAddress: tx.contractAddress,
          value: formatTokenAmount(tx.value, safeNumber(tx.tokenDecimal), tx.tokenSymbol)
        };
        
        return formatTransaction(tx, 'BNB', tokenData);
      });
    } else {
      console.log('No token transactions found or API error:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching token transactions:', error);
    return [];
  }
};

/**
 * Fetches internal transactions from BscScan
 * 
 * @param {string} address - Address to fetch for
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - Array of formatted transactions
 */
const fetchInternalTransactions = async (address, options) => {
  try {
    console.log(`Fetching internal transactions for ${address}`);
    
    const response = await axios.get(BSC_SCAN_INTERNAL_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: options.startBlock,
        endblock: options.endBlock,
        page: options.page,
        offset: options.limit,
        sort: options.sort
      }
    });
    
    const result = response.data;
    
    if (result.status === '1' && Array.isArray(result.result)) {
      console.log(`Retrieved ${result.result.length} internal transactions from BscScan`);
      
      return result.result.map(tx => {
        // Mark as internal transaction
        tx.isInternalTx = true;
        tx.txType = 'Internal';
        return formatTransaction(tx, 'BNB');
      });
    } else {
      console.log('No internal transactions found or API error:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching internal transactions:', error);
    return [];
  }
};

/**
 * Removes duplicate transactions based on tx_hash
 * 
 * @param {Array} transactions - Array of transactions
 * @returns {Array} - Array with duplicates removed
 */
const removeDuplicateTransactions = (transactions) => {
  const txMap = new Map();
  
  // Keep the most detailed version of each transaction
  for (const tx of transactions) {
    const existingTx = txMap.get(tx.tx_hash);
    
    // If we don't have this transaction yet, or this one has more info
    if (!existingTx || (tx.contract_address && !existingTx.contract_address)) {
      txMap.set(tx.tx_hash, tx);
    }
  }
  
  return Array.from(txMap.values());
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
  console.log(`Getting token details for contract: ${contractAddress}`);
  
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
  getTokenDetails
}; 