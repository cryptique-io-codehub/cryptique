/**
 * suiChain.js - Module for handling SUI chain transactions
 * Uses SUI Network API to fetch transactions for a given address
 * Note: SUI uses public RPC endpoints that don't require API keys
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  formatTokenAmount
} from '../chainUtils';

// SUI API endpoints - using public endpoints since SUI doesn't require API keys
const SUI_API_URL = 'https://fullnode.mainnet.sui.io';
const SUI_REST_API = `${SUI_API_URL}/rest`;

// Max results per page
const MAX_RESULTS = 100;

/**
 * Returns the name of the chain
 * @returns {string} - Chain name
 */
export const getName = () => 'SUI';

/**
 * Returns the full name of the chain
 * @returns {string} - Full chain name
 */
export const getFullName = () => 'Sui';

/**
 * Returns the explorer URL for a transaction
 * @param {string} txHash - Transaction hash
 * @returns {string} - Explorer URL
 */
export const getExplorerURL = (txHash) => {
  return `https://explorer.sui.io/txblock/${txHash}?network=mainnet`;
};

/**
 * Returns the explorer URL for an address
 * @param {string} address - Address to view
 * @returns {string} - Explorer URL
 */
export const getAddressExplorerURL = (address) => {
  return `https://explorer.sui.io/address/${address}?network=mainnet`;
};

/**
 * Validates if an address is a valid SUI address
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateAddress = (address) => {
  // SUI addresses are 0x followed by 64 hex characters (32 bytes)
  return isValidAddress(address) && address.length === 66;
};

/**
 * Returns the API URL for an address
 * @param {string} address - Address to query
 * @returns {string} - API URL
 */
export const getApiUrl = (address) => {
  return `${SUI_REST_API}/objects?owner=${address}`;
};

/**
 * Process API response for SUI objects
 * @param {Response} response - Fetch response object
 * @returns {Array} - Array of processed objects
 */
export const processApiResponse = async (response) => {
  try {
    const data = await response.json();
    if (!data || !data.result) {
      return [];
    }
    
    // Map the SUI objects to the common contract format
    return data.result.map(obj => ({
      name: obj.data?.content?.type || 'Unknown Type',
      address: obj.data?.objectId || '',
      balance: obj.data?.content?.fields?.balance || '0',
      type: 'token',
      chain: 'SUI'
    }));
  } catch (error) {
    console.error('Error processing SUI API response:', error);
    return [];
  }
};

/**
 * Get decoded transaction data (not fully implemented for SUI)
 * @param {string} input - Input data
 * @param {Object} abi - ABI definition
 * @returns {Object|null} - Decoded data or null
 */
export const getDecodedData = (input, abi) => {
  // SUI doesn't use the same ABI format as EVM chains
  // This would need a custom implementation for SUI
  return null;
};

/**
 * Get the network name
 * @returns {string} - Network name
 */
export const getNetwork = () => {
  return 'mainnet';
};

/**
 * Get the chain icon URL
 * @returns {string} - Icon URL
 */
export const getIcon = () => {
  return 'https://cryptologos.cc/logos/sui-sui-logo.png';
};

/**
 * Process a SUI token transfer transaction
 * 
 * @param {Object} tx - Raw transaction data
 * @returns {Object} - Processed transaction
 */
const processSuiTransaction = (tx) => {
  try {
    // Default 9 decimals for SUI
    const decimals = 9;
    
    // Format token amount
    const tokenAmount = formatTokenAmount(tx.amount || '0', decimals, 'SUI');
    
    // Create standardized transaction object
    return {
      tx_hash: tx.digest,
      from_address: tx.sender?.toLowerCase() || '',
      to_address: tx.recipient?.toLowerCase() || '',
      value_eth: tokenAmount,
      block_number: parseInt(tx.checkpoint || '0'),
      block_time: new Date(parseInt(tx.timestamp_ms)).toISOString(),
      chain: "SUI",
      contract_address: '',
      token_type: "SUI",
      token_amount: tx.amount || '0',
      token_symbol: 'SUI'
    };
  } catch (error) {
    console.error("Error processing SUI transaction:", error);
    
    // Return a fallback transaction with minimal info
    return {
      tx_hash: tx.digest,
      from_address: tx.sender?.toLowerCase() || '',
      to_address: tx.recipient?.toLowerCase() || '',
      value_eth: "0 SUI",
      block_number: parseInt(tx.checkpoint || '0'),
      block_time: new Date().toISOString(),
      chain: "SUI"
    };
  }
};

/**
 * Fetches SUI transactions for a given address
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Additional options for the API call
 * @param {number} options.limit - Maximum number of transactions to fetch (default: 100)
 * @param {number} options.startBlock - Start fetching from this block number (default: 0)
 * @returns {Promise<Object>} - Object containing transactions and metadata
 */
export const fetchSuiTransactions = async (address, options = {}) => {
  try {
    // Check if address is valid
    if (!validateAddress(address)) {
      return {
        transactions: [],
        metadata: {
          success: false,
          message: 'Invalid SUI address'
        }
      };
    }

    // Default options
    const limit = Math.min(options.limit || 100, 1000);
    const startBlock = options.startBlock || 0;
    const batchSize = 100; // SUI API typically limits to 100 results per request
    const maxRetries = 3; // Maximum number of retries for failed requests
    
    console.log(`Fetching up to ${limit} latest transactions from SUI Network for address: ${address}, starting from block ${startBlock}`);
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(limit / batchSize);
    console.log(`Will fetch in ${batchCount} batch(es) of ${batchSize}`);
    
    let allTransactions = [];
    
    // Construct API URL to fetch transactions
    let cursor = null;
    
    // Fetch transactions in batches
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      // If we've reached the limit, stop fetching
      if (allTransactions.length >= limit) {
        console.log(`Reached limit of ${limit} transactions`);
        break;
      }
      
      console.log(`Fetching batch ${batchIndex + 1}/${batchCount}`);
      
      let retryCount = 0;
      let success = false;
      let response;
      
      while (!success && retryCount < maxRetries) {
        try {
          // Prepare API URL with pagination parameters
          let apiUrl = `${SUI_REST_API}/transactions?limit=${batchSize}&filter={"FromAddress":"${address}"}`;
          
          // Add cursor for pagination if we have one
          if (cursor) {
            apiUrl += `&cursor=${cursor}`;
          }
          
          // Add delay for retries to prevent rate limiting
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount}/${maxRetries} after delay...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
          }
          
          // Fetch data - no API key needed for SUI
          response = await axios.get(apiUrl);
          
          // Success
          success = true;
        } catch (error) {
          console.error(`API request error (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
          retryCount++;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      
      // If all retries failed, break the loop
      if (!success) {
        console.log(`Batch ${batchIndex + 1} failed after ${maxRetries} retries. Using data collected so far.`);
        break;
      }
      
      // Check if we have data
      const data = response.data;
      if (!data || !data.result || !Array.isArray(data.result)) {
        console.log('No more transactions found or invalid data format');
        break;
      }
      
      const batchTransactions = data.result;
      
      // If no more transactions found, break out of the loop
      if (batchTransactions.length === 0) {
        console.log(`No more transactions found after batch ${batchIndex}`);
        break;
      }
      
      console.log(`Retrieved ${batchTransactions.length} transactions in batch ${batchIndex + 1}`);
      
      // Save cursor for next batch if available
      if (data.nextCursor) {
        cursor = data.nextCursor;
      } else {
        console.log('No next cursor available, pagination complete');
        break;
      }
      
      // Transform SUI transactions into the standard format
      const formattedTransactions = batchTransactions.map(tx => processSuiTransaction(tx));
      
      // Add transactions to our collection
      allTransactions = [...allTransactions, ...formattedTransactions];
      
      // If we didn't get a full batch, we've reached the end
      if (batchTransactions.length < batchSize) {
        console.log(`Received less than ${batchSize} transactions, no more to fetch`);
        break;
      }
    }
    
    return {
      transactions: allTransactions,
      metadata: {
        success: true,
        message: `Successfully retrieved ${allTransactions.length} transactions`,
        total: allTransactions.length,
        chain: "SUI",
        address: address
      }
    };
  } catch (error) {
    console.error('Error fetching SUI transactions:', error);
    return {
      transactions: [],
      metadata: {
        success: false,
        message: error.message
      }
    };
  }
};

export default {
  fetchSuiTransactions
}; 