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
  formatTransaction
} from '../chainUtils';

// API key for Base chain explorer
const BASESCAN_API_KEY = 'Q2NXNU8H6BXRI39QQIU575GBT7VIN4FQ8K';
const BASESCAN_API_URL = 'https://api.basescan.org/api';

/**
 * Fetches transactions for a contract from BaseScan API
 * @param {string} contractAddress - The contract address to fetch transactions for
 * @param {Object} options - Additional options for the fetch
 * @returns {Promise<Array>} - Array of processed transactions
 */
export const fetchBaseTransactions = async (contractAddress, options = {}) => {
  console.log(`Fetching Base chain transactions for contract: ${contractAddress}`);
  const { page = 1, limit = 1000 } = options;
  
  try {
    // First, try to get transactions from BaseScan API
    const transactions = await fetchFromBaseScan(contractAddress, page, limit);
    
    if (transactions.length > 0) {
      console.log(`Successfully fetched ${transactions.length} transactions from BaseScan API`);
      return transactions;
    }
    
    // If BaseScan doesn't provide results, fallback to Infura
    console.log("No transactions found via BaseScan, trying Infura...");
    const infuraTransactions = await fetchFromInfura(contractAddress);
    
    return infuraTransactions;
  } catch (error) {
    console.error("Error fetching Base chain transactions:", error);
    // Return empty array in case of error
    return [];
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
    const response = await axios.get(BASESCAN_API_URL, {
      params: {
        module: 'account',
        action: 'txlist',
        address: contractAddress,
        startblock: 0,
        endblock: 99999999,
        page,
        offset: adjustedLimit,
        sort: 'desc',
        apikey: BASESCAN_API_KEY
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
    
    const response = await axios.get(BASESCAN_API_URL, {
      params: {
        module: 'account',
        action: 'tokentx',  // ERC-20 token transfers
        address: contractAddress,
        page,
        offset: limit,
        sort: 'desc',
        apikey: BASESCAN_API_KEY
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