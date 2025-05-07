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
  // SUI addresses start with 0x and are 64 or 66 characters long (32 bytes)
  // Using a custom validation for SUI rather than the shared isValidAddress function
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Check if address starts with 0x
  if (!address.startsWith('0x')) {
    return false;
  }

  // Remove 0x prefix for length check
  const addressWithoutPrefix = address.slice(2);

  // Check if the rest is a valid hex string of correct length
  // SUI addresses can be 64 hex chars (32 bytes) or sometimes 66 chars
  const validLength = addressWithoutPrefix.length === 64 || addressWithoutPrefix.length === 66;
  const validHex = /^[0-9a-fA-F]+$/.test(addressWithoutPrefix);

  return validLength && validHex;
};

/**
 * Returns the API URL for an address
 * @param {string} address - Address to query
 * @returns {string} - API URL
 */
export const getApiUrl = (address) => {
  return `${SUI_API_URL}/rest`;
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
    
    // Extract transaction information
    const digest = tx.digest;
    const timestamp = tx.timestampMs ? parseInt(tx.timestampMs) : Date.now();
    
    // Extract sender from transaction
    const sender = tx.transaction?.data?.sender || '';
    
    // Try to extract recipient from effects or transaction data
    let recipient = '';
    let amount = '0';
    
    // Check if there are effects from the transaction
    if (tx.effects && tx.effects.events && Array.isArray(tx.effects.events)) {
      // Look for transfer events
      for (const event of tx.effects.events) {
        if (event.type && event.type.includes('TransferObject')) {
          recipient = event.recipient || '';
          break;
        }
      }
    }
    
    // Try to find amount from transaction data
    if (tx.transaction && tx.transaction.data && tx.transaction.data.transactions) {
      for (const innerTx of tx.transaction.data.transactions) {
        if (innerTx.Pay && innerTx.Pay.amount) {
          amount = innerTx.Pay.amount;
          break;
        }
      }
    }
    
    // Format token amount
    const tokenAmount = formatTokenAmount(amount, decimals, 'SUI');
    
    // Create standardized transaction object
    return {
      tx_hash: digest,
      from_address: sender.toLowerCase(),
      to_address: recipient.toLowerCase(),
      value_eth: tokenAmount,
      block_number: tx.checkpoint || '0',
      block_time: new Date(timestamp).toISOString(),
      chain: "SUI",
      contract_address: '',
      token_type: "SUI",
      token_amount: amount,
      token_symbol: 'SUI'
    };
  } catch (error) {
    console.error("Error processing SUI transaction:", error);
    
    // Return a fallback transaction with minimal info
    return {
      tx_hash: tx.digest || 'unknown',
      from_address: tx.transaction?.data?.sender?.toLowerCase() || '',
      to_address: '',
      value_eth: "0 SUI",
      block_number: tx.checkpoint || '0',
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
    const batchSize = 50; // Smaller batch size for reliability
    const maxRetries = 3;
    
    console.log(`Fetching transactions for SUI address: ${address} (limit: ${limit})`);
    
    let allTransactions = [];
    let cursor = null;
    
    // Calculate number of batches
    const batchCount = Math.ceil(limit / batchSize);
    
    // Fetch transactions using JSON RPC method
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      if (allTransactions.length >= limit) {
        break;
      }
      
      console.log(`Fetching batch ${batchIndex + 1}/${batchCount}`);
      
      let retryCount = 0;
      let success = false;
      let data;
      
      while (!success && retryCount < maxRetries) {
        try {
          // Use the JSON RPC endpoint with queryTransactionBlocks method
          const response = await axios.post(SUI_API_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'sui_getTransactionBlocks',
            params: [
              { FromAddress: address },
              {
                limit: batchSize,
                descendingOrder: true,
                cursor,
                options: {
                  showEffects: true,
                  showInput: true,
                  showEvents: true
                }
              }
            ]
          });
          
          data = response.data;
          success = true;
        } catch (error) {
          console.error(`API request error (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
          retryCount++;
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      }
      
      if (!success) {
        console.error(`Failed to fetch batch ${batchIndex + 1} after ${maxRetries} retries`);
        break;
      }
      
      // Process response data
      if (!data || !data.result || !data.result.data || !Array.isArray(data.result.data)) {
        console.log('No transactions found or invalid data format');
        break;
      }
      
      const transactions = data.result.data;
      
      if (transactions.length === 0) {
        console.log('No more transactions available');
        break;
      }
      
      console.log(`Retrieved ${transactions.length} transactions in batch ${batchIndex + 1}`);
      
      // Update cursor for next batch if available
      if (data.result.hasNextPage && data.result.nextCursor) {
        cursor = data.result.nextCursor;
      } else {
        console.log('No next page available');
        break;
      }
      
      // Process transactions
      const formattedTransactions = transactions.map(tx => processSuiTransaction(tx));
      
      // Add to collection
      allTransactions = [...allTransactions, ...formattedTransactions];
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