/**
 * bnbChain.js - Module for handling BNB chain transactions
 * Uses BscScan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput
} from '../chainUtils';

// API key should be in .env file
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY || 'YOUR_BSCSCAN_API_KEY';

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;
const BSC_SCAN_TOKEN_INFO_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=token&action=tokeninfo`;

// Max results per page
const MAX_RESULTS = 10000;

// Cache for token information to avoid repeated API calls
const tokenInfoCache = {};

/**
 * Fetch token information for a BEP20 token contract
 * 
 * @param {string} contractAddress - The token contract address
 * @returns {Promise<Object>} - Token information including name, symbol and decimals
 */
const getTokenInfo = async (contractAddress) => {
  // Check cache first
  if (tokenInfoCache[contractAddress]) {
    return tokenInfoCache[contractAddress];
  }
  
  // Default token info
  const defaultTokenInfo = {
    name: 'BEP20 Token',
    symbol: 'BEP20',
    decimals: 18
  };
  
  try {
    // Fetch token info from BscScan API
    const response = await axios.get(BSC_SCAN_TOKEN_INFO_ENDPOINT, {
      params: {
        apikey: BSC_SCAN_API_KEY,
        contractaddress: contractAddress,
        module: 'token',
        action: 'tokeninfo'
      }
    });
    
    // Process response
    if (
      response.data.status === '1' && 
      response.data.result && 
      Array.isArray(response.data.result) && 
      response.data.result.length > 0
    ) {
      const tokenData = response.data.result[0];
      
      const tokenInfo = {
        name: tokenData.name || defaultTokenInfo.name,
        symbol: tokenData.symbol || defaultTokenInfo.symbol,
        decimals: parseInt(tokenData.decimals || defaultTokenInfo.decimals)
      };
      
      // Cache the result
      tokenInfoCache[contractAddress] = tokenInfo;
      return tokenInfo;
    }
    
    // Return default if no valid response
    return defaultTokenInfo;
  } catch (error) {
    console.warn(`Error fetching token info for ${contractAddress}:`, error.message);
    return defaultTokenInfo;
  }
};

/**
 * Process a BEP20 token transfer transaction
 * 
 * @param {Object} tx - Raw transaction data
 * @returns {Promise<Object>} - Processed transaction
 */
const processBep20Transaction = async (tx) => {
  try {
    // Decode the BEP20 transfer data
    const decodedData = decodeERC20TransferInput(tx.input);
    
    if (!decodedData) {
      return formatTransaction(tx, 'BNB');
    }
    
    // Get token contract info
    const contractAddress = tx.to;
    const tokenInfo = await getTokenInfo(contractAddress);
    
    // Format token amount with proper decimal placement
    let tokenAmountFloat = parseFloat(decodedData.rawAmount) / Math.pow(10, tokenInfo.decimals);
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
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      value: `${displayAmount} ${tokenInfo.symbol}`,
      contractAddress: contractAddress
    };
    
    // Format transaction with token data
    return formatTransaction({
      ...tx,
      to: decodedData.recipient // Update recipient to actual token receiver
    }, 'BNB', tokenData);
  } catch (error) {
    console.error("Error processing BEP20 transaction:", error);
    return formatTransaction(tx, 'BNB');
  }
};

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
    // Fetch regular transactions only
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
    
    // Check for errors in regular transactions
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
      // Process transactions and identify BEP20 token transfers
      const txPromises = result.result.map(async (tx) => {
        // Check if this might be a BEP20 transfer
        if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
          return await processBep20Transaction(tx);
        }
        return formatTransaction(tx, 'BNB');
      });
      
      // Wait for all transaction processing to complete
      const transactions = await Promise.all(txPromises);
      
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