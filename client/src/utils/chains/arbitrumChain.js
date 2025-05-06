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
const ARBISCAN_API_KEY = process.env.REACT_APP_ARBISCAN_API_KEY;

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
 * Fetches transaction data from Arbiscan API for a given contract address
 * @param {string} contractAddress - The Arbitrum contract address to fetch transactions for
 * @param {Object} options - Additional options for the API request
 * @param {number} options.limit - Maximum number of transactions to fetch (default: 10000)
 * @param {number} options.startBlock - Start fetching from this block number (default: 0)
 * @returns {Promise<Object>} - Object containing the transactions and metadata
 */
export const fetchArbitrumTransactions = async (contractAddress, options = {}) => {
  try {
    // Default options
    const limit = Math.min(options.limit || 10000, 100000);
    const startBlock = options.startBlock || 0;
    const offset = 10000; // Arbiscan API typically limits to 10,000 results per request
    const maxRetries = 3; // Maximum number of retries for failed requests
    
    console.log(`Fetching up to ${limit} latest transactions from Arbiscan for contract: ${contractAddress}, starting from block ${startBlock}`);
    
    // Calculate number of batches needed
    const batchCount = Math.ceil(limit / offset);
    console.log(`Will fetch in ${batchCount} batch(es) of ${offset}`);
    
    let allTransactions = [];
    let lowestBlock = null; // Track lowest block number for pagination when using desc order
    let currentPage = 1; // Start with page 1 and increment for each batch
    
    // API key from env variable, fallback to a placeholder
    const apiKey = process.env.REACT_APP_ARBISCAN_API_KEY || "D2HXGN6QEQ6J1VRCYNZFYAPB3YEUAC5CFF";
    const baseUrl = ARBISCAN_API_URL;
    
    // Set of transaction hashes to detect duplicates
    const seenTxHashes = new Set();
    
    // Flag to track which pagination strategy to use
    let usePageBasedPagination = false;
    let consecutiveDuplicateBatches = 0;
    
    // Fetch transactions in batches
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      // If we've reached the limit, stop fetching
      if (allTransactions.length >= limit) {
        console.log(`Reached limit of ${limit} transactions`);
        break;
      }
      
      let endBlock, url;
      
      if (usePageBasedPagination) {
        // Use page-based pagination: increment the page number but use max block number
        endBlock = 999999999;
        url = `${baseUrl}?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=${endBlock}&page=${currentPage}&offset=${offset}&sort=desc&apikey=${apiKey}`;
        console.log(`Fetching batch ${batchIndex + 1}/${batchCount} using PAGE-BASED pagination. Page: ${currentPage}`);
      } else {
        // Use block-based pagination: use the same page number but decrement the end block
        endBlock = batchIndex === 0 ? 999999999 : (lowestBlock !== null ? lowestBlock - 1 : 999999999);
        url = `${baseUrl}?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=${endBlock}&page=1&offset=${offset}&sort=desc&apikey=${apiKey}`;
        console.log(`Fetching batch ${batchIndex + 1}/${batchCount} using BLOCK-BASED pagination. End block: ${endBlock}`);
      }
      
      console.log(`API URL for batch ${batchIndex + 1}: ${url}`);
      
      let retryCount = 0;
      let success = false;
      let response;
      
      while (!success && retryCount < maxRetries) {
        try {
          // Add delay for retries to prevent rate limiting
          if (retryCount > 0) {
            // Exponential backoff with jitter for retries
            const delay = Math.min(10000, 1000 * Math.pow(2, retryCount)) + Math.random() * 1000;
            console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Fetch data
          response = await axios.get(url);
          
          // Check for API errors
          if (response.data.status === "0") {
            const errorMsg = response.data.message || 'Unknown error';
            console.log(`Arbiscan API error: ${errorMsg} (attempt ${retryCount + 1}/${maxRetries})`);
            
            // Check for specific error messages
            if (errorMsg.includes("rate limit") || errorMsg.includes("Max rate limit") || errorMsg.includes("exceed")) {
              // Rate limit hit, wait longer before retry
              console.log("Rate limit reached, waiting before retry...");
              const rateLimitDelay = 10000 + (5000 * retryCount); // Increasing delay for rate limit errors
              console.log(`Waiting ${rateLimitDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
              retryCount++;
              continue;
            } else if (errorMsg.includes("No transactions found")) {
                // No transactions found is not an error, just end the loop
                console.log("No transactions found for this contract address");
                return {
                  transactions: allTransactions,
                  metadata: {
                    total: allTransactions.length,
                    chain: "Arbitrum",
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
      
      // Count transactions before removing duplicates
      const initialCount = batchTransactions.length;
      
      // Count transactions that are actually new (not seen before)
      let newTransactionsCount = 0;
      
      // Transform transactions to common format, filtering out duplicates
      const formattedTransactions = batchTransactions.filter(tx => {
        // Skip duplicates - only add transactions we haven't seen before
        if (seenTxHashes.has(tx.hash)) {
          return false;
        }
        
        // Add to seen set and include in filtered results
        seenTxHashes.add(tx.hash);
        newTransactionsCount++;
        return true;
      }).map(tx => {
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
            : "0 ARB",
          block_number: parseInt(tx.blockNumber),
          block_time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          chain: "Arbitrum",
          contract_address: contractAddress.toLowerCase()
        };
      });
      
      // Find block range in this batch for the next pagination
      if (batchTransactions.length > 0) {
        const blockNumbers = batchTransactions.map(tx => parseInt(tx.blockNumber));
        const highestBlockInBatch = Math.max(...blockNumbers);
        const lowestBlockInBatch = Math.min(...blockNumbers);
        console.log(`Batch ${batchIndex + 1} block range: ${highestBlockInBatch} to ${lowestBlockInBatch}`);
        
        // Update the lowest block number for the next batch ONLY if we're using block-based pagination
        if (!usePageBasedPagination) {
          lowestBlock = lowestBlockInBatch;
        }
      }
      
      // Check if we got any new transactions
      console.log(`Batch ${batchIndex + 1}: ${initialCount} total transactions, ${newTransactionsCount} new unique transactions`);
      
      // Add formatted transactions to our collection
      allTransactions = [...allTransactions, ...formattedTransactions];
      console.log(`Total transactions collected so far: ${allTransactions.length}`);
      
      // Pagination strategy adjustment:
      // If we got duplicate results (same block range) or very few new transactions, switch pagination strategy
      if (newTransactionsCount < initialCount * 0.1 && initialCount > 0) {
        consecutiveDuplicateBatches++;
        
        // If we get consecutive batches with duplicates, switch pagination strategy
        if (consecutiveDuplicateBatches >= 2) {
          if (usePageBasedPagination) {
            console.log("Page-based pagination is not working well. Switching back to block-based pagination.");
            usePageBasedPagination = false;
            // Ensure we have a reasonable lowestBlock value
            if (lowestBlock === null) {
              // If we don't have a valid lowest block yet, try to extract it from the data
              const allBlockNumbers = allTransactions.map(tx => tx.block_number);
              if (allBlockNumbers.length > 0) {
                lowestBlock = Math.min(...allBlockNumbers);
                console.log(`Setting lowest block to ${lowestBlock} based on collected transactions`);
              } else {
                // Fallback to a reasonable value
                lowestBlock = 999999999 - 1000000; // Go back 1M blocks
                console.log(`No valid block numbers found. Using ${lowestBlock} as fallback.`);
              }
            }
          } else {
            console.log("Block-based pagination is not working well. Switching to page-based pagination.");
            usePageBasedPagination = true;
            currentPage = 1; // Reset page count for fresh start
          }
          
          // Reset the counter
          consecutiveDuplicateBatches = 0;
        }
      } else {
        // We got good results, reset the counter
        consecutiveDuplicateBatches = 0;
      }
      
      // Advance to next page if using page-based pagination
      if (usePageBasedPagination) {
        currentPage++;
      }
      
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
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased delay between batches to avoid rate limits
      }
    }
    
    // Log final transaction count and block range
    if (allTransactions.length > 0) {
      const firstTx = allTransactions[0];
      const lastTx = allTransactions[allTransactions.length - 1];
      console.log(`First transaction block: ${firstTx.block_number}`);
      console.log(`Last transaction block: ${lastTx.block_number}`);
    }
    
    console.log(`Successfully fetched ${allTransactions.length} Arbitrum transactions for ${contractAddress}`);
    
    // Limit the number of transactions to the requested limit
    const limitedTransactions = allTransactions.slice(0, limit);
    
    // Return the transactions with metadata
    return {
      transactions: limitedTransactions,
      metadata: {
        total: limitedTransactions.length,
        chain: "Arbitrum",
        contract: contractAddress,
        lowestBlock: lowestBlock
      }
    };
  } catch (error) {
    console.error("Error fetching Arbitrum transactions:", error);
    return {
      transactions: [],
      metadata: {
        error: error.message,
        message: `Failed to fetch Arbitrum transactions: ${error.message}`
      }
    };
  }
};

export default {
  fetchArbitrumTransactions
}; 