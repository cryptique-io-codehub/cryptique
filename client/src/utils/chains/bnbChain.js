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
const BSC_SCAN_TOKEN_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=tokentx`;

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

  console.log(`Fetching BNB token transactions for address: ${address}`);
  
  // Define options
  const limit = options.limit || MAX_RESULTS;
  
  try {
    // Fetch token transactions
    const response = await axios.get(BSC_SCAN_TOKEN_TX_ENDPOINT, {
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
      // Process token transactions
      const transactions = result.result.map(tx => {
        // Extract token details
        const symbol = tx.tokenSymbol || 'UNKNOWN';
        const decimals = parseInt(tx.tokenDecimal || '18', 10);
        const name = tx.tokenName || 'Unknown Token';
        const contractAddress = tx.contractAddress;
        const rawAmount = tx.value;
        
        // Calculate display amount
        let tokenAmountFloat = parseFloat(rawAmount) / Math.pow(10, decimals);
        let displayAmount;
        
        // Handle the display format based on the size
        if (tokenAmountFloat >= 1) {
          displayAmount = tokenAmountFloat.toFixed(6).replace(/\.?0+$/, '');
        } else if (tokenAmountFloat >= 0.000001) {
          displayAmount = tokenAmountFloat.toFixed(8).replace(/\.?0+$/, '');
        } else {
          displayAmount = tokenAmountFloat.toExponential(6);
        }
        
        // Remove trailing decimal point if present
        if (displayAmount.endsWith('.')) {
          displayAmount = displayAmount.slice(0, -1);
        }
        
        // Create tokenData object
        const tokenData = {
          isToken: true,
          symbol,
          name,
          value: `${displayAmount} ${symbol}`,
          contractAddress,
          decimals
        };
        
        // Format transaction with token data
        return formatTransaction({
          hash: tx.hash,
          timeStamp: tx.timeStamp,
          blockNumber: tx.blockNumber,
          from: tx.from,
          to: tx.to,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          ...tokenData
        }, 'BNB', tokenData);
      });
      
      console.log(`Retrieved ${transactions.length} token transactions from BscScan`);
      
      return {
        transactions,
        metadata: {
          status: 'success',
          message: 'Token transactions retrieved successfully',
          total: transactions.length
        }
      };
    }
    
    // Handle no results
    return {
      transactions: [],
      metadata: {
        status: 'no_results',
        message: 'No token transactions found for this address',
        total: 0
      }
    };
  } catch (error) {
    console.error('Error fetching BNB token transactions:', error);
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