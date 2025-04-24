/**
 * bnbChain.js - Module for handling BNB chain transactions
 * Uses BscScan API to fetch transactions for a given address
 */

import axios from 'axios';
import { 
  formatTransaction, 
  formatTokenAmount,
  safeNumber,
  isValidAddress 
} from '../chainUtils';

// API key should be in .env file
const BSC_SCAN_API_KEY = process.env.REACT_APP_BSC_SCAN_API_KEY || 'YOUR_BSCSCAN_API_KEY';

// BscScan API endpoints
const BSC_SCAN_BASE_URL = 'https://api.bscscan.com/api';
const BSC_SCAN_ACCT_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=txlist`;
const BSC_SCAN_TOKEN_TX_ENDPOINT = `${BSC_SCAN_BASE_URL}?module=account&action=tokentx`;

// Max results per page
const MAX_RESULTS = 10000;

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
    console.log(`Requesting up to ${limit} transactions from BscScan API`);
    
    // Fetch both normal transactions and token transfers in parallel
    const [normalTxResult, tokenTxResult] = await Promise.all([
      // Normal transactions
      axios.get(BSC_SCAN_ACCT_TX_ENDPOINT, {
        params: {
          address,
          apikey: BSC_SCAN_API_KEY,
          startblock: 0,
          endblock: 999999999,
          page: 1,
          offset: limit,
          sort: 'desc'
        }
      }),
      // Token transfers
      axios.get(BSC_SCAN_TOKEN_TX_ENDPOINT, {
        params: {
          address,
          apikey: BSC_SCAN_API_KEY,
          startblock: 0,
          endblock: 999999999,
          page: 1,
          offset: limit,
          sort: 'desc'
        }
      })
    ]);
    
    // Process normal transactions
    let normalTransactions = [];
    if (normalTxResult.data.status === '1' && Array.isArray(normalTxResult.data.result)) {
      normalTransactions = normalTxResult.data.result.map(tx => formatTransaction(tx, 'BNB'));
      console.log(`Retrieved ${normalTransactions.length} normal transactions`);
    } else {
      console.log('No normal transactions found or API error:', normalTxResult.data.message);
    }
    
    // Process token transfers
    let tokenTransfers = [];
    if (tokenTxResult.data.status === '1' && Array.isArray(tokenTxResult.data.result)) {
      tokenTransfers = tokenTxResult.data.result.map(tx => {
        // Create token data with detailed token information
        const tokenData = {
          isToken: true,
          name: tx.tokenName || 'Unknown Token',
          symbol: tx.tokenSymbol || 'TOKEN',
          contractAddress: tx.contractAddress,
          value: formatTokenAmount(tx.value, safeNumber(tx.tokenDecimal), tx.tokenSymbol),
          rawAmount: tx.value,
          tokenDecimal: tx.tokenDecimal
        };
        
        // Create formatted transaction with token data
        const formattedTx = formatTransaction(tx, 'BNB', tokenData);
        
        // Add token transfer specific fields
        formattedTx.token_transfers = {
          token_name: tx.tokenName,
          token_symbol: tx.tokenSymbol,
          token_decimal: tx.tokenDecimal,
          amount: formatTokenAmount(tx.value, safeNumber(tx.tokenDecimal)),
          formatted_amount: formatTokenAmount(tx.value, safeNumber(tx.tokenDecimal), tx.tokenSymbol),
          from: tx.from,
          to: tx.to,
          contract_address: tx.contractAddress
        };
        
        return formattedTx;
      });
      console.log(`Retrieved ${tokenTransfers.length} token transfers`);
    } else {
      console.log('No token transfers found or API error:', tokenTxResult.data.message);
    }
    
    // Create a map of normal transactions for quick lookup
    const txMap = new Map();
    normalTransactions.forEach(tx => {
      txMap.set(tx.tx_hash, tx);
    });
    
    // Merge token transfers into normal transactions if they exist
    // or add them as separate transactions
    tokenTransfers.forEach(tokenTx => {
      const existingTx = txMap.get(tokenTx.tx_hash);
      
      if (existingTx) {
        // Add token transfer info to the existing transaction
        existingTx.token_transfers = tokenTx.token_transfers;
        existingTx.tx_type = `${tokenTx.token_transfers.token_symbol} Transfer`;
      } else {
        // Add as a new transaction
        txMap.set(tokenTx.tx_hash, tokenTx);
      }
    });
    
    // Convert map back to array and sort by block number (descending)
    const combinedTransactions = Array.from(txMap.values())
      .sort((a, b) => b.block_number - a.block_number);
    
    console.log(`Combined total: ${combinedTransactions.length} transactions`);
    
    return {
      transactions: combinedTransactions,
      metadata: {
        status: 'success',
        message: 'Transactions retrieved successfully',
        total: combinedTransactions.length
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