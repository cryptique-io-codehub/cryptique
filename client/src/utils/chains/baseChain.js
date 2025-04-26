/**
 * baseChain.js - Base chain transaction processing
 * Handles all Base chain specific transaction fetching and processing
 * Prioritizes explorer API with Infura as fallback
 */

import axios from 'axios';
import { 
  safeNumber, 
  hexToDecimalString, 
  formatTokenAmount, 
  decodeERC20TransferInput,
  formatTransaction,
  isValidAddress
} from '../chainUtils';

// API key should be in .env file
const BASE_SCAN_API_KEY = process.env.REACT_APP_BASE_SCAN_API_KEY || 'YOUR_BASESCAN_API_KEY';

// BaseScan API endpoints
const BASE_SCAN_BASE_URL = 'https://api.basescan.org/api';
const BASE_SCAN_ACCT_TX_ENDPOINT = `${BASE_SCAN_BASE_URL}?module=account&action=txlist`;

// Max results per page
const MAX_RESULTS = 10000;

/**
 * Process an ERC20 token transfer transaction
 * 
 * @param {Object} tx - Raw transaction data
 * @returns {Object} - Processed transaction
 */
const processErc20Transaction = (tx) => {
  try {
    const decodedInput = decodeERC20TransferInput(tx.input);
    if (!decodedInput) return null;

    return {
      ...formatTransaction(tx, 'Base'),
      tx_type: 'ERC20 Transfer',
      to_address: decodedInput.to,
      value_eth: `${decodedInput.value} TOKEN`,
      token_symbol: 'TOKEN',
      is_token_transfer: true
    };
  } catch (error) {
    console.error('Error processing ERC20 transaction:', error);
    return null;
  }
};

/**
 * Fetches transactions for a Base address or contract
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Options for the fetch request
 * @param {number} options.limit - Maximum number of transactions to return
 * @param {number} options.startBlock - Block number to start fetching from
 * @returns {Promise<Object>} - Object containing transactions and metadata
 */
export const fetchBaseTransactions = async (address, options = {}) => {
  // Validate address
  if (!isValidAddress(address)) {
    console.error('Invalid Base address format:', address);
    return {
      transactions: [],
      metadata: {
        status: 'error',
        message: 'Invalid address format',
        total: 0
      }
    };
  }

  console.log(`Fetching Base transactions for address: ${address}`);
  
  // Define options
  const limit = options.limit || MAX_RESULTS;
  const startBlock = options.startBlock || 0;
  
  try {
    // Fetch regular transactions
    const response = await axios.get(BASE_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address,
        apikey: BASE_SCAN_API_KEY,
        startblock: startBlock,
        endblock: 999999999,
        page: 1,
        offset: limit,
        sort: 'desc'
      }
    });
    
    const result = response.data;
    
    // Check for errors
    if (result.status === '0') {
      console.error('BaseScan API error:', result.message);
      return {
        transactions: [],
        metadata: {
          status: 'error',
          message: `BaseScan API error: ${result.message}`,
          total: 0
        }
      };
    }
    
    // Process successful response
    if (result.status === '1' && Array.isArray(result.result)) {
      // Process transactions and identify ERC20 token transfers
      const transactions = result.result.map(tx => {
        // Check if this might be an ERC20 transfer
        if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
          const processedTx = processErc20Transaction(tx);
          return processedTx || formatTransaction(tx, 'Base');
        }
        return formatTransaction(tx, 'Base');
      }).filter(tx => tx !== null);
      
      console.log(`Retrieved ${transactions.length} transactions from BaseScan`);
      
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
    console.error('Error fetching Base transactions:', error);
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

/**
 * Fetch transactions from BaseScan API
 * @param {string} contractAddress - Contract address to fetch transactions for
 * @param {number} page - Page number to fetch (1-based)
 * @param {number} limit - Number of transactions per page
 * @returns {Promise<Array>} - Array of processed transactions
 */
const fetchFromBaseScan = async (contractAddress, page = 1, limit = 1000) => {
  try {
    console.log(`Fetching page ${page} from BaseScan API with limit ${limit}`);
    
    // Adjust limit if we might exceed the 10,000 result window limit
    const adjustedLimit = page * limit > 10000 ? Math.floor(10000 / page) : limit;
    if (adjustedLimit !== limit) {
      console.log(`Adjusted limit to ${adjustedLimit} to avoid exceeding result window size`);
    }
    
    // Fetch regular transactions first
    const response = await axios.get(BASE_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address: contractAddress,
        apikey: BASE_SCAN_API_KEY,
        startblock: 0,
        endblock: 99999999,
        page,
        offset: adjustedLimit,
        sort: 'desc'
      }
    });
    
    // Check if response is valid
    if (response.data.status !== '1' || !Array.isArray(response.data.result)) {
      console.log(`BaseScan API error or no results: ${response.data.message || 'Unknown error'}`);
      
      // Try token transfers if regular transactions fail
      return fetchTokenTransfersFromBaseScan(contractAddress, page, adjustedLimit);
    }
    
    // Process transactions
    const rawTransactions = response.data.result;
    console.log(`Found ${rawTransactions.length} regular transactions on BaseScan`);
    
    // Transform transactions to standardized format
    const processedTransactions = rawTransactions.map(tx => processBaseScanTransaction(tx, contractAddress));
    
    // Cache token details for better performance
    await cacheTokenDetails(processedTransactions);
    
    return processedTransactions;
  } catch (error) {
    console.error("Error fetching from BaseScan API:", error);
    return [];
  }
};

/**
 * Fetch token transfers from BaseScan API
 * @param {string} contractAddress - Contract address
 * @param {number} page - Page number
 * @param {number} limit - Number of transfers per page
 * @returns {Promise<Array>} - Array of processed transactions
 */
const fetchTokenTransfersFromBaseScan = async (contractAddress, page = 1, limit = 1000) => {
  try {
    console.log(`Fetching ERC-20 token transfers from BaseScan API`);
    
    const response = await axios.get(BASE_SCAN_ACCT_TX_ENDPOINT, {
      params: {
        address: contractAddress,
        apikey: BASE_SCAN_API_KEY,
        page,
        offset: limit,
        sort: 'desc'
      }
    });
    
    if (response.data.status !== '1' || !Array.isArray(response.data.result)) {
      console.log(`No token transfers found on BaseScan: ${response.data.message || 'Unknown error'}`);
      return [];
    }
    
    const tokenTransfers = response.data.result;
    console.log(`Found ${tokenTransfers.length} token transfers on BaseScan`);
    
    // Process token transfers
    return tokenTransfers.map(tx => {
      const decimals = parseInt(tx.tokenDecimal || 18);
      const symbol = tx.tokenSymbol || 'TOKEN';
      
      // Calculate token value
      const tokenValue = formatTokenAmount(tx.value, decimals, symbol);
      
      return formatTransaction(tx, 'Base', {
        isToken: true,
        name: tx.tokenName || 'ERC-20 Token',
        symbol,
        contractAddress: tx.contractAddress,
        value: tokenValue
      });
    });
  } catch (error) {
    console.error("Error fetching token transfers from BaseScan:", error);
    return [];
  }
};

/**
 * Process a transaction from BaseScan API
 * @param {Object} tx - Raw transaction data
 * @param {string} contractAddress - Contract address being queried
 * @returns {Object} - Processed transaction
 */
const processBaseScanTransaction = (tx, contractAddress) => {
  try {
    // Check if this might be an ERC-20 transfer
    if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
      return processERC20Transaction(tx, contractAddress);
    }
    
    // Regular non-token transaction
    return formatTransaction(tx, 'Base');
  } catch (error) {
    console.error("Error processing Base transaction:", error);
    return formatTransaction(tx, 'Base');
  }
};

/**
 * Process an ERC-20 token transfer transaction
 * @param {Object} tx - Raw transaction data
 * @param {string} contractAddress - Contract address being queried
 * @returns {Object} - Processed transaction
 */
const processERC20Transaction = (tx, contractAddress) => {
  try {
    // Decode the ERC-20 transfer data
    const decodedData = decodeERC20TransferInput(tx.input);
    
    if (!decodedData) {
      return formatTransaction(tx, 'Base');
    }
    
    const tokenRecipient = decodedData.recipient;
    const rawAmount = decodedData.rawAmount;
    
    // Apply 18 decimals by default for ERC-20 tokens
    const decimals = 18;
    
    // Format token amount with proper decimal placement
    let tokenAmountFloat = parseFloat(rawAmount) / Math.pow(10, decimals);
    let displayAmount;
    
    // Handle the display format based on the size
    if (tokenAmountFloat >= 1) {
      // For values greater than 1, show up to 6 decimal places
      displayAmount = tokenAmountFloat.toFixed(6).replace(/\.?0+$/, '');
    } else if (tokenAmountFloat >= 0.000001) {
      // For smaller values, show more precision
      displayAmount = tokenAmountFloat.toFixed(8).replace(/\.?0+$/, '');
    } else {
      // For tiny values, use scientific notation
      displayAmount = tokenAmountFloat.toExponential(6);
    }
    
    // Remove trailing decimal point if present
    if (displayAmount.endsWith('.')) {
      displayAmount = displayAmount.slice(0, -1);
    }
    
    // Create token transaction object
    return {
      tx_hash: tx.hash,
      block_number: parseInt(tx.blockNumber),
      block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      from_address: tx.from,
      to_address: tokenRecipient,
      value_eth: `${displayAmount} TOKEN`,
      gas_used: tx.gasUsed,
      status: tx.isError === '0' ? 'Success' : 'Failed',
      tx_type: 'ERC-20 Transfer',
      contract_address: tx.to,
      token_name: "ERC-20 Token",
      token_symbol: "TOKEN",
      usd_value: 'N/A',
      chain: 'Base',
      raw_amount: rawAmount
    };
  } catch (error) {
    console.error("Error processing ERC-20 transaction:", error);
    return formatTransaction(tx, 'Base');
  }
};

/**
 * Fetch transactions using Infura as fallback
 * @param {string} contractAddress - Contract address
 * @returns {Promise<Array>} - Array of processed transactions
 */
const fetchFromInfura = async (contractAddress) => {
  // This would use Web3/Infura to fetch data as a fallback
  // For now, just return empty array until Infura implementation is completed
  console.log("Infura fallback not yet implemented for Base chain");
  return [];
};

/**
 * Cache token details for contracts in transactions
 * Helps optimize performance for multiple transactions from same token contract
 * @param {Array} transactions - Array of transactions to process
 */
const cacheTokenDetails = async (transactions) => {
  // This function would fetch token details for all unique token contracts
  // and cache them for better performance
  // Implementation details would depend on your caching strategy
  console.log("Token details caching not yet implemented");
};

export default {
  fetchBaseTransactions,
  fetchFromBaseScan,
  processBaseScanTransaction,
  processERC20Transaction
}; 