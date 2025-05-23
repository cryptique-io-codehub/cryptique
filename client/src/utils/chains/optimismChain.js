/**
 * optimismChain.js - Module for handling Optimism chain transactions
 * Uses Optimistic Etherscan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput
} from '../chainUtils';

// API key should be in .env file
const OPTIMISTIC_ETHERSCAN_API_KEY = process.env.REACT_APP_OPTIMISM_API_KEY;

// Optimistic Etherscan API endpoints
const OPTIMISTIC_ETHERSCAN_API_URL = 'https://api-optimistic.etherscan.io/api';
const OPTIMISTIC_ETHERSCAN_ACCT_TX_ENDPOINT = `${OPTIMISTIC_ETHERSCAN_API_URL}?module=account&action=txlist`;

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
      return formatTransaction(tx, 'Optimism');
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
      symbol: 'OP', // Generic symbol since we don't have actual token info
      value: `${displayAmount} OP`,
      contractAddress: tx.to // Contract address is the 'to' field in tx
    };
    
    // Format transaction with token data
    return formatTransaction({
      ...tx,
      to: decodedData.recipient // Update recipient to actual token receiver
    }, 'Optimism', tokenData);
  } catch (error) {
    console.error("Error processing ERC-20 transaction on Optimism:", error);
    return formatTransaction(tx, 'Optimism');
  }
};

/**
 * Fetches transaction data from Optimistic Etherscan API for a given contract address
 * @param {string} contractAddress - The Optimism contract address to fetch transactions for
 * @param {Object} options - Additional options for the API request
 * @param {number} options.limit - Maximum number of transactions to fetch (default: 10000)
 * @param {number} options.startBlock - Start fetching from this block number (default: 0)
 * @returns {Promise<Object>} - Object containing the transactions and metadata
 */
export const fetchOptimismTransactions = async (contractAddress, options = {}) => {
  try {
    // Default options
    const limit = Math.min(options.limit || 10000, 100000);
    const startBlock = options.startBlock || 0;
    const offset = 10000; // Optimistic Etherscan API typically limits to 10,000 results per request
    const maxRetries = 3; // Maximum number of retries for failed requests
    
    console.log(`Fetching up to ${limit} latest transactions from Optimistic Etherscan for contract: ${contractAddress}, starting from block ${startBlock}`);
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(limit / offset);
    console.log(`Will fetch in ${batchCount} batch(es) of ${offset}`);
    
    let allTransactions = [];
    let lowestBlock = 0; // Track lowest block number for pagination when using desc order
    
    // API key from env variable, fallback to a placeholder
    const apiKey = process.env.REACT_APP_OPTIMISM_API_KEY || "EBPK7ZQEWZKQYCJ8RX1F2387WF1Z7U1TZ1";
    const baseUrl = OPTIMISTIC_ETHERSCAN_API_URL;
    
    // Fetch transactions in batches
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      // If we've reached the limit, stop fetching
      if (allTransactions.length >= limit) {
        console.log(`Reached limit of ${limit} transactions`);
        break;
      }
      
      // When using desc sort, we need to use endblock for pagination to get older transactions
      // For the first batch, use a very high block number to start from the latest
      let currentEndBlock = batchIndex === 0 ? 999999999 : lowestBlock - 1;
      console.log(`Fetching batch ${batchIndex + 1}/${batchCount}, ending at block ${currentEndBlock}`);
      
      let retryCount = 0;
      let success = false;
      let response;
      
      // Use page=1 since we're using blockNumber for pagination
      const page = 1;
      
      while (!success && retryCount < maxRetries) {
        try {
          // Prepare API URL with pagination parameters
          const url = `${baseUrl}?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=${currentEndBlock}&page=${page}&offset=${offset}&sort=desc&apikey=${apiKey}`;
          
          // Add delay for retries to prevent rate limiting
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount}/${maxRetries} after delay...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
          }
          
          // Fetch data
          response = await axios.get(url);
          
          // Check for API errors
          if (response.data.status === "0") {
            const errorMsg = response.data.message || 'Unknown error';
            console.log(`Optimistic Etherscan API error: ${errorMsg} (attempt ${retryCount + 1}/${maxRetries})`);
            
            // Check for specific error messages
            if (errorMsg.includes("rate limit") || errorMsg.includes("Max rate limit")) {
              // Rate limit hit, wait longer before retry
              console.log("Rate limit reached, waiting before retry...");
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for rate limit
            } else if (errorMsg.includes("No transactions found")) {
              // No transactions found is not an error, just end the loop
              console.log("No transactions found for this contract address");
    return {
                transactions: allTransactions,
      metadata: {
                  total: allTransactions.length,
                  chain: "Optimism",
                  contract: contractAddress,
                  lowestBlock: lowestBlock,
                  message: "No transactions found"
                }
              };
            } else {
              retryCount++;
              continue;
            }
          } else {
            // Success
            success = true;
          }
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
        // Find the lowest block number for next batch when using desc order
        const blockNumber = parseInt(tx.blockNumber);
        if (lowestBlock === 0 || blockNumber < lowestBlock) {
          lowestBlock = blockNumber;
        }
        
        // Check if this might be an ERC-20 transfer
        if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
          return processERC20Transaction(tx);
        }
        
        // Format transaction
        return {
          tx_hash: tx.hash,
          from_address: tx.from.toLowerCase(),
          to_address: tx.to?.toLowerCase() || "",
          value_eth: parseFloat(tx.value) / 1e18 > 0 
            ? (parseFloat(tx.value) / 1e18).toString() 
            : "0 OP",
          block_number: blockNumber,
          block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          chain: "Optimism",
          contract_address: contractAddress.toLowerCase()
        };
      });
      
      // Add transactions to our collection
      allTransactions = [...allTransactions, ...formattedTransactions];
      
      // If we didn't get a full batch, we've reached the end
      if (batchTransactions.length < offset) {
        console.log(`Received less than ${offset} transactions, no more to fetch`);
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
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between batches
      }
    }
    
    // Limit the number of transactions to the requested limit
    const limitedTransactions = allTransactions.slice(0, limit);
    
    // Return the transactions with metadata
    return {
      transactions: limitedTransactions,
      metadata: {
        total: limitedTransactions.length,
        chain: "Optimism",
        contract: contractAddress,
        lowestBlock: lowestBlock
      }
    };
  } catch (error) {
    console.error("Error fetching Optimism transactions:", error);
    return {
      transactions: [],
      metadata: {
        error: error.message,
        message: `Failed to fetch Optimism transactions: ${error.message}`
      }
    };
  }
};

export default {
  fetchOptimismTransactions
}; 