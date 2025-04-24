/**
 * chainUtils.js - Utility functions for blockchain data processing
 * Contains shared functions used across different chain implementations
 */

import { ethers } from 'ethers';

/**
 * Safely converts a value to a number, returning a default if conversion fails
 * 
 * @param {any} value - The value to convert to a number
 * @param {number} defaultValue - Default value to return if conversion fails
 * @returns {number} - The converted number or default value
 */
export const safeNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  
  // Handle string "null" or "undefined"
  if (value === "null" || value === "undefined") return defaultValue;
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Converts a hexadecimal string to a decimal string
 * Useful for handling large numbers beyond JavaScript's Number.MAX_SAFE_INTEGER
 * 
 * @param {string} hexString - Hexadecimal string to convert
 * @returns {string} - Decimal string representation
 */
export const hexToDecimalString = (hexString) => {
  try {
    // Remove '0x' prefix if present
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    
    // Use ethers.js BigNumber for safe conversion
    const bigNumber = ethers.BigNumber.from(`0x${cleanHex}`);
    return bigNumber.toString();
  } catch (error) {
    console.error('Error converting hex to decimal:', error);
    return '0';
  }
};

/**
 * Formats a token amount based on decimals
 * 
 * @param {string|number} amount - The token amount (can be a string or number)
 * @param {number} decimals - Number of decimals for the token
 * @param {string} symbol - Token symbol to append (optional)
 * @returns {string} - Formatted token amount with symbol if provided
 */
export const formatTokenAmount = (amount, decimals = 18, symbol = '') => {
  try {
    if (amount === undefined || amount === null) return '0';
    
    // Convert to string if not already
    const amountStr = String(amount);
    
    // Handle zero case
    if (amountStr === '0') return symbol ? `0 ${symbol}` : '0';
    
    // Convert to BigNumber for precision
    let bigAmount;
    try {
      // Try to create a BigNumber directly
      bigAmount = ethers.BigNumber.from(amountStr);
    } catch (error) {
      // If it fails (e.g., for decimal strings), use a fallback approach
      console.warn('BigNumber creation failed, using fallback:', error);
      
      // Remove decimal point if present
      const parts = amountStr.split('.');
      const integerPart = parts[0] || '0';
      const decimalPart = parts[1] || '';
      
      // Create approximation - note this may lose precision for very large numbers
      const approxAmount = integerPart + decimalPart.padEnd(decimals, '0');
      return (Number(integerPart + '.' + decimalPart) || 0).toLocaleString() + 
             (symbol ? ` ${symbol}` : '');
    }
    
    // Format with correct decimals
    const formattedAmount = ethers.utils.formatUnits(bigAmount, decimals);
    
    // Remove trailing zeros after decimal point
    const cleanAmount = formattedAmount.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
    
    // Add symbol if provided
    return symbol ? `${cleanAmount} ${symbol}` : cleanAmount;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return symbol ? `0 ${symbol}` : '0';
  }
};

/**
 * Decodes ERC20/BEP20 transfer input data from transaction input
 * Extracts recipient address and token amount
 * 
 * @param {string} inputData - Transaction input data
 * @returns {Object|null} - Object with decoded recipient and amount, or null if failed
 */
export const decodeERC20TransferInput = (inputData) => {
  try {
    // ERC20 transfer function signature: transfer(address,uint256)
    // Function selector: 0xa9059cbb
    if (!inputData || !inputData.startsWith('0xa9059cbb')) {
      return null;
    }
    
    // Remove function selector (0xa9059cbb) to get parameters
    const params = inputData.slice(10);
    
    // First parameter: recipient address (32 bytes/64 chars)
    // Remove leading zeros and add 0x prefix
    const recipient = '0x' + params.slice(24, 64).replace(/^0+/, '');
    
    // Second parameter: amount (32 bytes/64 chars)
    const rawAmount = params.slice(64);
    const amount = hexToDecimalString(rawAmount);
    
    return {
      recipient,
      rawAmount: amount
    };
  } catch (error) {
    console.error('Error decoding ERC20 transfer input:', error);
    return null;
  }
};

/**
 * Creates a standardized transaction object from different chain formats
 * 
 * @param {Object} tx - Transaction data from blockchain API
 * @param {string} chain - Chain identifier (e.g., 'ETH', 'BNB')
 * @param {Object} tokenData - Optional token data for token transfers
 * @returns {Object} - Standardized transaction object
 */
export const formatTransaction = (tx, chain, tokenData = null) => {
  try {
    // Default values for fields that might be missing
    const defaults = {
      hash: '',
      blockNumber: '0',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      from: '',
      to: '',
      value: '0',
      gasUsed: '0',
      isError: '0'
    };
    
    // Merge defaults with actual transaction data
    const transaction = { ...defaults, ...tx };
    
    // Convert timestamp to date if it's a number
    const timestamp = safeNumber(transaction.timeStamp, 0);
    const date = new Date(timestamp * 1000);
    
    // Determine transaction type
    let txType = 'Transfer';
    if (tokenData?.isToken) {
      txType = `${tokenData.symbol || 'Token'} Transfer`;
    } else if (transaction.functionName?.includes('transfer')) {
      txType = 'Transfer';
    } else if (transaction.input && transaction.input.length > 10) {
      txType = 'Contract Interaction';
    }
    
    // Format the standard transaction object
    const formattedTx = {
      tx_hash: transaction.hash,
      block_number: safeNumber(transaction.blockNumber),
      block_time: date.toISOString(),
      from_address: transaction.from,
      to_address: transaction.to,
      value_eth: tokenData ? 
        tokenData.value : 
        formatTokenAmount(transaction.value, 18, chain),
      gas_used: safeNumber(transaction.gasUsed),
      status: transaction.isError === '0' ? 'Success' : 'Failed',
      tx_type: txType,
      chain: chain
    };
    
    // Add token data if this is a token transfer
    if (tokenData) {
      formattedTx.contract_address = tokenData.contractAddress;
      formattedTx.token_name = tokenData.name;
      formattedTx.token_symbol = tokenData.symbol;
    }
    
    return formattedTx;
  } catch (error) {
    console.error('Error formatting transaction:', error);
    
    // Return a minimal transaction object in case of error
    return {
      tx_hash: tx.hash || 'unknown',
      block_number: safeNumber(tx.blockNumber, 0),
      block_time: new Date().toISOString(),
      from_address: tx.from || '',
      to_address: tx.to || '',
      value_eth: '0',
      gas_used: 0,
      status: 'Unknown',
      tx_type: 'Unknown',
      chain: chain
    };
  }
};

/**
 * Gets the current block number for a blockchain
 * This is a mock implementation - in production you would use a real provider
 * 
 * @param {string} chain - Chain identifier (e.g., 'ETH', 'BNB')
 * @returns {Promise<number>} - Current block number
 */
export const getCurrentBlockNumber = async (chain) => {
  console.log(`Getting current block number for ${chain}`);
  // In production, you would use a provider to get the real block number
  // For now, return a mock value
  return Promise.resolve(30000000);
};

/**
 * Validates if a string is a valid blockchain address
 * Currently supports EVM-compatible addresses
 * 
 * @param {string} address - Address to validate
 * @returns {boolean} - Whether the address is valid
 */
export const isValidAddress = (address) => {
  try {
    // Basic validation for EVM addresses (0x followed by 40 hex characters)
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  } catch (error) {
    console.error('Error validating address:', error);
    return false;
  }
};

export default {
  safeNumber,
  hexToDecimalString,
  formatTokenAmount,
  decodeERC20TransferInput,
  formatTransaction,
  getCurrentBlockNumber,
  isValidAddress
}; 