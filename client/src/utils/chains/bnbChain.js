/**
 * bnbChain.js - Module for handling BNB chain transactions
 * Uses BscScan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress 
} from '../chainUtils';

// API key should be in .env file
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY || 'YOUR_BSCSCAN_API_KEY';

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;

// Max results per page
const MAX_RESULTS = 10000;

/**
 * Fetches transactions for a BNB address or contract
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.limit - Maximum number of transactions to return
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
        total: 0
      }
    };
  }

  console.log(`Fetching BNB transactions for address: ${address}`);
  
  // Define options
  const limit = options.limit || MAX_RESULTS;
  
  try {
    console.log(`Requesting up to ${limit} transactions from BscScan API`);
    
    // Make API request to BscScan
    const response = await axios.get(BSC_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: BSC_SCAN_API_KEY,
        startblock: 0,
        endblock: 999999999,
        page: 1,
        offset: limit,
        sort: 'desc'
      }
    });
    
    const result = response.data;
    
    // Check for errors
    if (result.status === '0') {
      console.error('BscScan API error:', result.message);
      return {
        transactions: [],
        metadata: {
          status: 'error',
          message: `BscScan API error: ${result.message}`,
          total: 0
        }
      };
    }
    
    // Process successful response
    if (result.status === '1' && Array.isArray(result.result)) {
      const transactions = result.result.map(tx => formatTransaction(tx, 'BNB'));
      console.log(`Retrieved ${transactions.length} transactions from BscScan`);
      
      return {
        transactions,
        metadata: {
          status: 'success',
          message: 'Transactions retrieved successfully',
          total: transactions.length
        }
      };
    }
    
    // Handle no results
    return {
      transactions: [],
      metadata: {
        status: 'no_results',
        message: 'No transactions found for this address',
        total: 0
      }
    };
  } catch (error) {
    console.error('Error fetching BNB transactions:', error);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: error.message || 'Unknown error occurred',
        total: 0
      }
    };
  }
};

export default {
  fetchBnbTransactions
}; 