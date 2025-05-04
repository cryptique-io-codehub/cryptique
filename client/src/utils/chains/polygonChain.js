/**
 * polygonChain.js - Module for handling Polygon chain transactions
 * Uses Polygonscan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput
} from '../chainUtils';

// API key should be in .env file
const POLYGONSCAN_API_KEY = process.env.REACT_APP_POLYGONSCAN_API_KEY;

// Polygonscan API endpoints
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const POLYGONSCAN_ACCT_TX_ENDPOINT = `${POLYGONSCAN_API_URL}?module=account&action=txlist`;

// Max results per page
const MAX_RESULTS = 10000;

/**
 * Process an ERC-20 token transfer transaction
 * 
 * @param {Object} tx - Raw transaction data
 * @returns {Object} - Processed transaction
 */
const processERC20Transaction = (tx) => {
  try {
    // Decode the ERC-20 transfer data
    const decodedData = decodeERC20TransferInput(tx.input);
    
    if (!decodedData) {
      return formatTransaction(tx, 'Polygon');
    }
    
    // Default 18 decimals (most common)
    const decimals = 18;
    
    // Format token amount with proper decimal placement
    let tokenAmountFloat = parseFloat(decodedData.rawAmount) / Math.pow(10, decimals);
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
    
    // Create tokenData object for formatTransaction
    const tokenData = {
      isToken: true,
      symbol: 'MATIC', // Generic symbol since we don't have actual token info
      value: `${displayAmount} MATIC`,
      contractAddress: tx.to // Contract address is the 'to' field in tx
    };
    
    // Format transaction with token data
    return formatTransaction({
      ...tx,
      to: decodedData.recipient // Update recipient to actual token receiver
    }, 'Polygon', tokenData);
  } catch (error) {
    console.error("Error processing ERC-20 transaction on Polygon:", error);
    return formatTransaction(tx, 'Polygon');
  }
};

/**
 * Fetches transactions for a Polygon address or contract
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.limit - Maximum number of transactions to return
 * @param {number} options.startBlock - Block number to start fetching from
 * @returns {Promise<Object>} - Object containing transactions and metadata
 */
export const fetchPolygonTransactions = async (address, options = {}) => {
  // Validate address
  if (!isValidAddress(address)) {
    console.error('Invalid Polygon address format:', address);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: 'Invalid address format',
        total: 0
      }
    };
  }

  console.log(`Fetching Polygon transactions for address: ${address}`);
  
  // Define options
  const limit = options.limit || MAX_RESULTS;
  const startBlock = options.startBlock || 0;
  
  try {
    // Fetch regular transactions only
    const response = await axios.get(POLYGONSCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: POLYGONSCAN_API_KEY,
        startblock: startBlock,
        endblock: 999999999,
        page: 1,
        offset: limit,
        sort: 'desc'
      }
    });
    
    const result = response.data;
    
    // Check for errors in regular transactions
    if (result.status === '0') {
      console.error('Polygonscan API error:', result.message);
      return {
        transactions: [],
        metadata: {
          status: 'error',
          message: `Polygonscan API error: ${result.message}`,
          total: 0
        }
      };
    }
    
    // Process successful response
    if (result.status === '1' && Array.isArray(result.result)) {
      // Process transactions and identify ERC-20 token transfers
      const transactions = result.result.map(tx => {
        // Check if this might be an ERC-20 transfer
        if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
          return processERC20Transaction(tx);
        }
        return formatTransaction(tx, 'Polygon');
      });
      
      console.log(`Retrieved ${transactions.length} transactions from Polygonscan`);
      
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
    console.error('Error fetching Polygon transactions:', error);
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
  fetchPolygonTransactions
}; 