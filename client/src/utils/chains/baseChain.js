/**
 * baseChain.js - Module for handling Base chain transactions
 * Uses BaseScan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput,
  formatTokenAmount
} from '../chainUtils';

// API key should be in .env file
const BASESCAN_API_KEY = process.env.REACT_APP_BASESCAN_API_KEY;

// BaseScan API endpoints
const BASESCAN_API_URL = 'https://api.basescan.org/api';
const BASESCAN_ACCT_TX_ENDPOINT = `${BASESCAN_API_URL}?module=account&action=txlist`;
    
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
      return formatTransaction(tx, 'Base');
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
      symbol: 'TOKEN', // Generic symbol since we don't have actual token info
      value: `${displayAmount} TOKEN`,
      contractAddress: tx.to // Contract address is the 'to' field in tx
    };
    
    // Format transaction with token data
    return formatTransaction({
      ...tx,
      to: decodedData.recipient // Update recipient to actual token receiver
    }, 'Base', tokenData);
  } catch (error) {
    console.error("Error processing ERC-20 transaction:", error);
    return formatTransaction(tx, 'Base');
  }
};

/**
 * Fetches transaction data from BaseScan API for a given contract address
 * @param {string} contractAddress - The Base contract address to fetch transactions for
 * @param {Object} options - Additional options for the API request
 * @param {number} options.limit - Maximum number of transactions to fetch (default: 10000)
 * @param {number} options.startBlock - Start fetching from this block number (default: 0)
 * @returns {Promise<Object>} - Object containing the transactions and metadata
 */
export const fetchBaseTransactions = async (contractAddress, options = {}) => {
  try {
    // Default options
    const limit = Math.min(options.limit || 10000, 100000);
    const startBlock = options.startBlock || 0;
    const batchSize = 10000; // BaseScan API has a limit of 10,000 per request
    
    console.log(`Fetching up to ${limit} transactions from BaseScan for contract: ${contractAddress}, starting from block ${startBlock}`);
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(limit / batchSize);
    console.log(`Will fetch in ${batchCount} batch(es) of ${batchSize}`);
    
    let allTransactions = [];
    let highestBlock = 0;
    
    // Fetch transactions in batches
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      // If we've reached the limit, stop fetching
      if (allTransactions.length >= limit) {
        console.log(`Reached limit of ${limit} transactions`);
        break;
      }
      
      let currentStartBlock = highestBlock > 0 ? highestBlock + 1 : startBlock;
      console.log(`Fetching batch ${batchIndex + 1}/${batchCount}, starting from block ${currentStartBlock}`);
      
      // Prepare API URL
      const apiKey = "GMYP4T9SF7P34QC9DXY4VSKX81RTBUXMMF"; // BaseScan API key
      const baseUrl = "https://api.basescan.org/api";
      const url = `${baseUrl}?module=account&action=txlist&address=${contractAddress}&startblock=${currentStartBlock}&endblock=99999999&sort=asc&apikey=${apiKey}`;
      
      // Fetch data
      const response = await axios.get(url);
      
      // Check for API errors
      if (response.data.status === "0") {
        if (batchIndex === 0) {
          // If this is the first batch and there's an error, return the error
          throw new Error(`BaseScan API error: ${response.data.message || 'Unknown error'}`);
        } else {
          // If we've already got some transactions, just log the error and stop fetching
          console.log(`BaseScan API error on batch ${batchIndex + 1}: ${response.data.message || 'Unknown error'}`);
          break;
        }
      }
      
      // Process transactions
      const batchTransactions = response.data.result;
      
      // If no more transactions found, break out of the loop
      if (!batchTransactions || batchTransactions.length === 0) {
        console.log(`No more transactions found after batch ${batchIndex}`);
        break;
      }
      
      console.log(`Retrieved ${batchTransactions.length} transactions in batch ${batchIndex + 1}`);
      
      // Transform transactions to common format
      const formattedTransactions = batchTransactions.map(tx => {
        // Find the highest block number for next batch
        const blockNumber = parseInt(tx.blockNumber);
        if (blockNumber > highestBlock) {
          highestBlock = blockNumber;
        }
        
        // Format transaction
        return {
          tx_hash: tx.hash,
          from_address: tx.from.toLowerCase(),
          to_address: tx.to?.toLowerCase() || "",
          value_eth: parseFloat(tx.value) / 1e18 > 0 
            ? (parseFloat(tx.value) / 1e18).toString() 
            : "0 ETH",
          block_number: blockNumber,
          block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          chain: "Base",
          contract_address: contractAddress.toLowerCase()
        };
      });
      
      // Add transactions to our collection
      allTransactions = [...allTransactions, ...formattedTransactions];
      
      // If we didn't get a full batch, we've reached the end
      if (batchTransactions.length < batchSize) {
        console.log(`Received less than ${batchSize} transactions, no more to fetch`);
        break;
      }
      
      // If we've reached the limit, stop fetching
      if (allTransactions.length >= limit) {
        console.log(`Reached limit of ${limit} transactions`);
        break;
      }
      
      // Add a small delay between batches to avoid rate limits
      if (batchIndex < batchCount - 1) {
        console.log('Waiting briefly before next batch...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
      }
    }
    
    // Limit the number of transactions to the requested limit
    const limitedTransactions = allTransactions.slice(0, limit);
    
    // Return the transactions with metadata
    return {
      transactions: limitedTransactions,
      metadata: {
        total: limitedTransactions.length,
        chain: "Base",
        contract: contractAddress,
        highestBlock: highestBlock
      }
    };
  } catch (error) {
    console.error("Error fetching Base transactions:", error);
    return {
      transactions: [],
      metadata: {
        error: error.message,
        message: `Failed to fetch Base transactions: ${error.message}`
      }
    };
  }
};

export default {
  fetchBaseTransactions
}; 