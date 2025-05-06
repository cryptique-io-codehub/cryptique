/**
 * bnbChain.js - Module for handling BNB chain transactions
 * Uses BscScan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  isValidAddress,
  decodeERC20TransferInput,
  formatTokenAmount
} from '../chainUtils';

// API key should be in .env file
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY;

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;

// Max results per page
const MAX_RESULTS = 10000;

/**
 * Process a BEP20 token transfer transaction
 * 
 * @param {Object} tx - Raw transaction data
 * @returns {Object} - Processed transaction
 */
const processBep20Transaction = (tx) => {
  try {
    // Decode the BEP20 transfer data (same format as ERC20)
    const decodedData = decodeERC20TransferInput(tx.input);
    
    if (!decodedData) {
      // Fall back to standard transaction if decoding failed
      console.log("Failed to decode BEP20 transfer data");
      return {
        tx_hash: tx.hash,
        from_address: tx.from.toLowerCase(),
        to_address: tx.to?.toLowerCase() || "",
        value_eth: "0 BEP20",
        block_number: parseInt(tx.blockNumber),
        block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        chain: "BNB Chain",
        contract_address: tx.to?.toLowerCase() || ""
      };
    }
    
    // Default 18 decimals (most common)
    const decimals = 18;
    
    // Format token amount properly using the utility function
    const tokenAmount = formatTokenAmount(decodedData.rawAmount, decimals, 'BEP20');
    
    console.log(`Decoded BEP20 transfer: ${decodedData.rawAmount} -> ${tokenAmount}`);
    
    // Create standardized transaction object
    return {
      tx_hash: tx.hash,
      from_address: tx.from.toLowerCase(),
      to_address: decodedData.recipient.toLowerCase(),  // Use the actual recipient from decoded data
      value_eth: tokenAmount,
      block_number: parseInt(tx.blockNumber),
      block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      chain: "BNB Chain",
      contract_address: tx.to?.toLowerCase() || "",
      token_type: "BEP20",
      token_address: tx.to?.toLowerCase() || "",
      token_amount: decodedData.rawAmount
    };
  } catch (error) {
    console.error("Error processing BEP20 transaction:", error);
    
    // Return a fallback transaction with minimal info
    return {
      tx_hash: tx.hash,
      from_address: tx.from.toLowerCase(),
      to_address: tx.to?.toLowerCase() || "",
      value_eth: "0 BEP20",
      block_number: parseInt(tx.blockNumber),
      block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      chain: "BNB Chain",
      contract_address: tx.to?.toLowerCase() || ""
    };
  }
};

/**
 * Fetches transaction data from BscScan API for a given contract address
 * @param {string} contractAddress - The BNB Chain contract address to fetch transactions for
 * @param {Object} options - Additional options for the API request
 * @param {number} options.limit - Maximum number of transactions to fetch (default: 10000)
 * @param {number} options.startBlock - Start fetching from this block number (default: 0)
 * @returns {Promise<Object>} - Object containing the transactions and metadata
 */
export const fetchBnbTransactions = async (contractAddress, options = {}) => {
  try {
    // Default options
    const limit = Math.min(options.limit || 10000, 100000);
    const startBlock = options.startBlock || 0;
    const batchSize = 10000; // BscScan API has a limit of 10,000 per request
    const maxRetries = 3; // Maximum number of retries for failed requests
    
    console.log(`Fetching up to ${limit} latest transactions from BscScan for contract: ${contractAddress}, starting from block ${startBlock}`);
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(limit / batchSize);
    console.log(`Will fetch in ${batchCount} batch(es) of ${batchSize}`);
    
    let allTransactions = [];
    let lowestBlock = 0; // Track lowest block number for pagination when using desc order
    
    // API key from env variable, fallback to hardcoded for demo
    const apiKey = process.env.REACT_APP_BSC_SCAN_API_KEY || "KBB6KGQWFHXBVYDF2X1Y4C2MWBQX2ZFJ5I";
    const baseUrl = "https://api.bscscan.com/api";
    
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
      
      // Add explicit pagination parameters (offset, page)
      const offset = batchSize; // Number of records to retrieve
      const page = 1;   // First page
      
      while (!success && retryCount < maxRetries) {
        try {
          // Prepare API URL with pagination parameters
          const url = `${baseUrl}?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=${currentEndBlock}&page=${page}&offset=${batchSize}&sort=desc&apikey=${apiKey}`;
          
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
            console.log(`BscScan API error: ${errorMsg} (attempt ${retryCount + 1}/${maxRetries})`);
            
            // Check for specific error messages
            if (errorMsg.includes("rate limit") || errorMsg.includes("Max rate limit")) {
              // Rate limit hit, wait longer before retry
              console.log("Rate limit reached, waiting before retry...");
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds for rate limit
            } else if (errorMsg.includes("No transactions found")) {
              // No transactions found is not an error, just end the loop
              console.log("No transactions found for this contract address");
              return {
                transactions: allTransactions,
                metadata: {
                  total: allTransactions.length,
                  chain: "BNB Chain",
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
        
        // Check if this might be a BEP-20 token transfer
        if (tx.value === '0' && tx.input && tx.input.startsWith('0xa9059cbb')) {
          return processBep20Transaction(tx);
        }
        
        // Format standard transaction
        return {
          tx_hash: tx.hash,
          from_address: tx.from.toLowerCase(),
          to_address: tx.to?.toLowerCase() || "",
          value_eth: parseFloat(tx.value) / 1e18 > 0 
            ? (parseFloat(tx.value) / 1e18).toString() 
            : "0 BEP20",
          block_number: blockNumber,
          block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          chain: "BNB Chain",
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
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay between batches
      }
    }
    
    // Limit the number of transactions to the requested limit
    const limitedTransactions = allTransactions.slice(0, limit);
    
    // Return the transactions with metadata
    return {
      transactions: limitedTransactions,
      metadata: {
        total: limitedTransactions.length,
        chain: "BNB Chain",
        contract: contractAddress,
        lowestBlock: lowestBlock
      }
    };
  } catch (error) {
    console.error("Error fetching BNB Chain transactions:", error);
    return {
      transactions: [],
      metadata: {
        error: error.message,
        message: `Failed to fetch BNB Chain transactions: ${error.message}`
      }
    };
  }
};

export default {
  fetchBnbTransactions
}; 