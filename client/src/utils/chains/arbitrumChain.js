/**
 * arbitrumChain.js - Module for handling Arbitrum chain transactions
 * Uses Arbiscan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput
} from '../chainUtils';

// API key should be in .env file
const ARBISCAN_API_KEY = process.env.REACT_APP_ARBISCAN_API_KEY || 'YOUR_ARBISCAN_API_KEY';

// Arbiscan API endpoints
const ARBISCAN_API_URL = 'https://api.arbiscan.io/api';
const ARBISCAN_ACCT_TX_ENDPOINT = `${ARBISCAN_API_URL}?module=account&action=txlist`;

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
      return formatTransaction(tx, 'Arbitrum');
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
      symbol: 'ARB', // Generic symbol since we don't have actual token info
      value: `${displayAmount} ARB`,
      contractAddress: tx.to // Contract address is the 'to' field in tx
    };
    
    // Format transaction with token data
    return formatTransaction({
      ...tx,
      to: decodedData.recipient // Update recipient to actual token receiver
    }, 'Arbitrum', tokenData);
  } catch (error) {
    console.error("Error processing ERC-20 transaction on Arbitrum:", error);
    return formatTransaction(tx, 'Arbitrum');
  }
};

/**
 * Fetches transactions for an Arbitrum address or contract
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.limit - Maximum number of transactions to return
 * @param {number} options.startBlock - Block number to start fetching from
 * @returns {Promise<Object>} - Object containing transactions and metadata
 */
export const fetchArbitrumTransactions = async (address, options = {}) => {
  // Validate address
  if (!isValidAddress(address)) {
    console.error('Invalid Arbitrum address format:', address);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: 'Invalid address format',
        total: 0
      }
    };
  }

  console.log(`Fetching Arbitrum transactions for address: ${address}`);
  
  // Define options
  const limit = options.limit || MAX_RESULTS;
  const startBlock = options.startBlock || 0;
  
  try {
    // Fetch regular transactions only
    const response = await axios.get(ARBISCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: ARBISCAN_API_KEY,
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
      console.error('Arbiscan API error:', result.message);
      return {
        transactions: [],
        metadata: {
          status: 'error',
          message: `Arbiscan API error: ${result.message}`,
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
        return formatTransaction(tx, 'Arbitrum');
      });
      
      console.log(`Retrieved ${transactions.length} transactions from Arbiscan`);
      
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
    console.error('Error fetching Arbitrum transactions:', error);
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
  fetchArbitrumTransactions
}; 