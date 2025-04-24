/* eslint-env es2020 */
/* global BigInt */
/**
 * chainUtils.js - Utility functions for blockchain data processing
 * Contains shared functions used across different chain implementations
 */

// Try to import ethers, but provide fallbacks if not available
let ethers;
try {
  ethers = require('ethers');
} catch (e) {
  console.warn('Ethers.js not available, using fallback implementations');
  // Fallback implementations will be used
}

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
    // If ethers is available, use it for the conversion
    if (ethers) {
      // Remove '0x' prefix if present
      const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
      
      // Use ethers.js BigNumber for safe conversion
      const bigNumber = ethers.BigNumber.from(`0x${cleanHex}`);
      return bigNumber.toString();
    } else {
      // Fallback implementation without ethers
      if (!hexString) return '0';
      
      // Remove '0x' prefix if present
      const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
      if (cleanHex === '0') return '0';
      
      // For small enough hex values, use native parseInt
      if (cleanHex.length <= 10) {
        return parseInt(`0x${cleanHex}`, 16).toString();
      }
      
      // For larger hex values, use a manual conversion approach
      // Convert hex to decimal without BigInt or ethers
      // Each hex digit contributes a power of 16
      let decimal = 0;
      const hexDigits = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, 'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15,
        'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15
      };
      
      // Process 8 digits at a time to avoid overflow
      const chunks = [];
      for (let i = 0; i < cleanHex.length; i += 8) {
        chunks.push(cleanHex.slice(i, Math.min(i + 8, cleanHex.length)));
      }
      
      // Process each chunk and combine
      let result = '0';
      for (const chunk of chunks) {
        // Process this chunk
        let chunkValue = 0;
        for (let i = 0; i < chunk.length; i++) {
          const digit = hexDigits[chunk[i]] || 0;
          chunkValue = chunkValue * 16 + digit;
        }
        
        // Combine with previous result
        // result = result * (16^chunk.length) + chunkValue
        const multiplier = Math.pow(16, chunk.length);
        if (typeof BigInt !== 'undefined') {
          result = (BigInt(result) * BigInt(multiplier) + BigInt(chunkValue)).toString();
        } else {
          // Fallback for environments without BigInt
          result = (Number(result) * multiplier + chunkValue).toString();
        }
      }
      
      return result;
    }
  } catch (error) {
    console.error('Error converting hex to decimal:', error);
    // As a last resort, try using BigInt directly if available
    try {
      if (typeof BigInt !== 'undefined') {
        return BigInt(`0x${hexString.replace(/^0x/, '')}`).toString();
      }
      return '0';
    } catch (err) {
      return '0';
    }
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
    
    // If ethers is available, use it for precise formatting
    if (ethers) {
      try {
        // Try to create a BigNumber directly
        const bigAmount = ethers.BigNumber.from(amountStr);
        
        // Format with correct decimals
        const formattedAmount = ethers.utils.formatUnits(bigAmount, decimals);
        
        // Remove trailing zeros after decimal point
        const cleanAmount = formattedAmount.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
        
        // Add symbol if provided
        return symbol ? `${cleanAmount} ${symbol}` : cleanAmount;
      } catch (error) {
        // Fallback to manual formatting below
        console.warn('Failed to format with ethers:', error);
      }
    }
    
    // Fallback implementation without ethers
    // Handle scientific notation
    if (/e[+-]/.test(amountStr)) {
      const [significand, exponent] = amountStr.split(/e([+-])/);
      const exp = parseInt(exponent.substring(1));
      const isNegativeExponent = exponent.startsWith('-');
      
      if (isNegativeExponent) {
        // For small numbers: e.g., 1e-18
        const zeroes = '0'.repeat(exp - 1);
        const result = `0.${zeroes}${significand.replace(/\./g, '')}`;
        return symbol ? `${result} ${symbol}` : result;
      } else {
        // For large numbers: e.g., 1.2e+18
        const parts = significand.split('.');
        const integerPart = parts[0];
        const fractionalPart = parts[1] || '';
        
        const paddedFractional = fractionalPart + '0'.repeat(exp - fractionalPart.length);
        const result = integerPart + paddedFractional;
        
        // Apply decimals
        return formatWithDecimals(result, decimals, symbol);
      }
    }
    
    // Regular case: apply decimals directly
    return formatWithDecimals(amountStr, decimals, symbol);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return symbol ? `0 ${symbol}` : '0';
  }
};

/**
 * Helper function to format a number with the given number of decimals
 */
const formatWithDecimals = (amountStr, decimals, symbol) => {
  // Remove any non-numeric characters except the decimal point
  const cleanAmount = amountStr.replace(/[^\d.]/g, '');
  
  // Handle the case where decimals need to be added
  if (cleanAmount.length <= decimals) {
    const paddedAmount = '0'.repeat(decimals - cleanAmount.length + 1) + cleanAmount;
    const integerPart = paddedAmount.slice(0, paddedAmount.length - decimals) || '0';
    const fractionalPart = paddedAmount.slice(paddedAmount.length - decimals);
    
    // Format with commas and trim trailing zeros
    const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let formattedFrac = fractionalPart.replace(/0+$/, '');
    
    if (formattedFrac.length > 0) {
      return symbol ? `${formattedInt}.${formattedFrac} ${symbol}` : `${formattedInt}.${formattedFrac}`;
    } else {
      return symbol ? `${formattedInt} ${symbol}` : formattedInt;
    }
  } else {
    // Regular case: insert decimal point at the right position
    const position = cleanAmount.length - decimals;
    const integerPart = cleanAmount.slice(0, position) || '0';
    const fractionalPart = cleanAmount.slice(position);
    
    // Format with commas and trim trailing zeros
    const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let formattedFrac = fractionalPart.replace(/0+$/, '');
    
    if (formattedFrac.length > 0) {
      return symbol ? `${formattedInt}.${formattedFrac} ${symbol}` : `${formattedInt}.${formattedFrac}`;
    } else {
      return symbol ? `${formattedInt} ${symbol}` : formattedInt;
    }
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
      formattedTx.token_value = tokenData.value;
      
      // Include token value in tx_type for better visibility
      formattedTx.tx_type = `${tokenData.symbol} Transfer (${tokenData.value})`;
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