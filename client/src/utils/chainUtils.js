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
export const formatTransaction = (tx, chain, tokenData = null, contractType = 'main') => {
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

    // Add additional fields for staking analysis
    formattedTx.input = transaction.input || '';
    formattedTx.functionName = transaction.functionName || '';
    formattedTx.methodId = transaction.methodId || '';

    // Add staking analysis for escrow contracts
    if (contractType === 'escrow') {
      const stakingAnalysis = identifyStakingTransaction(formattedTx, contractType);
      formattedTx.stakingAnalysis = stakingAnalysis;
      if (stakingAnalysis.isStaking) {
        formattedTx.stakingType = stakingAnalysis.stakingType;
        formattedTx.stakingConfidence = stakingAnalysis.confidence;
      }
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

/**
 * Extracts unlock time from transaction input data
 * Handles various patterns used by different staking contracts
 * 
 * @param {string} input - Transaction input data
 * @param {string} stakingType - Type of staking operation
 * @returns {Object|null} - Unlock time information or null
 */
const extractUnlockTimeFromInput = (input, stakingType = '') => {
  try {
    if (!input || input.length < 10) return null;
    
    // Remove function selector (first 4 bytes / 8 hex chars)
    const params = input.slice(10);
    
    // Different patterns for different staking operations
    const patterns = [];
    
    if (stakingType === 'create_lock') {
      // For create_lock, unlock_time is typically the second parameter (after amount)
      patterns.push(
        { offset: 64, description: 'unlock_time as second parameter (after amount)' },
        { offset: 0, description: 'unlock_time as first parameter' },
        { offset: 128, description: 'unlock_time as third parameter' }
      );
    } else if (stakingType === 'increase_amount') {
      // For increase_amount, unlock_time might be updated or referenced
      patterns.push(
        { offset: 64, description: 'new unlock_time as second parameter' },
        { offset: 128, description: 'new unlock_time as third parameter' },
        { offset: 0, description: 'unlock_time as first parameter' }
      );
    } else if (stakingType === 'increase_unlock_time') {
      // For increase_unlock_time, the new unlock time is usually the main parameter
      patterns.push(
        { offset: 0, description: 'new unlock_time as first parameter' },
        { offset: 64, description: 'new unlock_time as second parameter' }
      );
    } else {
      // Default patterns for other operations
      patterns.push(
        { offset: 64, description: 'unlock_time as second parameter' },
        { offset: 0, description: 'unlock_time as first parameter' },
        { offset: 128, description: 'unlock_time as third parameter' }
      );
    }
    
    for (const pattern of patterns) {
      if (params.length >= pattern.offset + 64) {
        const unlockTimeHex = params.slice(pattern.offset, pattern.offset + 64);
        const unlockTimestamp = parseInt(unlockTimeHex, 16);
        
        // Validate timestamp (should be reasonable future time)
        const now = Math.floor(Date.now() / 1000);
        const oneYear = 365 * 24 * 60 * 60; // 1 year in seconds
        const tenYears = 10 * oneYear;
        
        // Check if it's a valid future timestamp (between now and 10 years from now)
        if (unlockTimestamp > now && unlockTimestamp < now + tenYears) {
          const lockDuration = unlockTimestamp - now;
          const unlockDate = new Date(unlockTimestamp * 1000);
          
          return {
            unlockTimestamp,
            unlockTime: unlockDate.toISOString(),
            lockDuration,
            lockDurationDays: Math.floor(lockDuration / (24 * 60 * 60)),
            lockDurationHours: Math.floor(lockDuration / (60 * 60)),
            pattern: pattern.description,
            extractedFrom: stakingType || 'unknown'
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting unlock time:', error);
    return null;
  }
};

/**
 * Identifies if a transaction is related to staking/escrow operations
 * Based on method signatures and input data patterns
 * Enhanced with chain-specific patterns and comprehensive method detection
 * 
 * @param {Object} transaction - Transaction object
 * @param {string} contractType - Type of contract ('main', 'escrow')
 * @returns {Object} - Analysis result with type and details
 */
export const identifyStakingTransaction = (transaction, contractType = 'main') => {
  const result = {
    isStaking: false,
    stakingType: null,
    confidence: 0,
    details: {}
  };

  // Only analyze for escrow contracts
  if (contractType !== 'escrow') {
    return result;
  }

  try {
    const input = transaction.input || '';
    const functionName = transaction.functionName || '';
    const methodId = transaction.methodId || '';
    
    // Enhanced staking method signatures and patterns for different chains
    const stakingPatterns = {
      // Create lock - First staking by wallet
      create_lock: {
        signatures: [
          // Common create_lock signatures
          '0x65fc3873', // create_lock(uint256,uint256)
          '0x4957677c', // createLock(uint256,uint256)
          '0x2c4e722e', // stake(uint256,uint256)
          '0x7acb7757', // deposit(uint256,uint256)
          '0xa694fc3a', // lock(uint256,uint256)
          // Curve-style voting escrow
          '0x65fc3873', // create_lock(uint256,uint256)
          '0x4957677c', // createLock(uint256,uint256)
          // Yearn-style
          '0x2c4e722e', // stake(uint256,uint256)
          // Compound-style
          '0x7acb7757', // deposit(uint256,uint256)
          // Additional patterns found in different chains
          '0xa9059cbb', // transfer-like patterns for staking
          '0x1249c58b', // mint-like patterns for staking
          '0x40c10f19', // mintTo patterns
          '0x6057361d', // lockTokens patterns
        ],
        keywords: [
          'create_lock', 'createlock', 'lock', 'stake', 'deposit', 'mint',
          'lockTokens', 'stakeTokens', 'depositTokens', 'lockup', 'commit',
          'escrow', 'vest', 'bond'
        ],
        type: 'create_lock'
      },
      // Increase amount - Increase staking amount
      increase_amount: {
        signatures: [
          '0x4957677c', // increase_amount(uint256)
          '0x2c4e722e', // increaseAmount(uint256)
          '0x4f6ccce7', // addStake(uint256)
          '0x7acb7757', // deposit(uint256) - additional deposit
          '0xa694fc3a', // addLock(uint256)
          '0x3ccfd60b', // topup(uint256)
          '0x8e19899e', // increaseStake(uint256)
          '0x1249c58b', // mint(uint256) - additional minting
          '0x40c10f19', // mintTo(address,uint256)
          '0x6057361d', // addTokens(uint256)
          '0x47e7ef24', // compound(uint256)
          '0x2e1a7d4d', // reinvest(uint256)
        ],
        keywords: [
          'increase_amount', 'increaseamount', 'increase', 'add_stake', 'addstake',
          'deposit', 'topup', 'compound', 'reinvest', 'addlock', 'addtokens',
          'increasestake', 'mint', 'mintto', 'extend_stake'
        ],
        type: 'increase_amount'
      },
      // Withdraw - Normal withdrawal when staking expires
      withdraw: {
        signatures: [
          '0x3ccfd60b', // withdraw()
          '0x2e1a7d4d', // withdraw(uint256)
          '0x8e19899e', // unstake()
          '0x69328dec', // unstake(uint256)
          '0x7c025200', // redeem()
          '0x1c1b8772', // redeem(uint256)
          '0x379607f5', // claim()
          '0x4e71d92d', // claim(uint256)
          '0x2f4f21e2', // exit()
          '0x853828b6', // release()
          '0x19165587', // release(uint256)
          '0x5312ea8e', // unlock()
          '0x2f6c493c', // unlock(uint256)
          '0xa2fb1175', // harvest()
          '0x4641257d', // harvest(uint256)
        ],
        keywords: [
          'withdraw', 'unstake', 'redeem', 'claim', 'exit', 'release', 'unlock',
          'harvest', 'collect', 'retrieve', 'getreward', 'cashout', 'liquidate',
          'mature', 'expire', 'complete'
        ],
        type: 'withdraw'
      },
      // Withdraw early - Early withdrawal before expiry
      withdraw_early: {
        signatures: [
          '0x69328dec', // withdraw_early()
          '0x7c025200', // withdrawEarly()
          '0x1c1b8772', // force_withdraw()
          '0x2f4f21e2', // forceWithdraw()
          '0x853828b6', // emergency_withdraw()
          '0x19165587', // emergencyWithdraw()
          '0x5312ea8e', // break_lock()
          '0x2f6c493c', // breakLock()
          '0xa2fb1175', // early_exit()
          '0x4641257d', // earlyExit()
          '0x379607f5', // penalty_withdraw()
          '0x4e71d92d', // penaltyWithdraw()
          '0x2e1a7d4d', // forfeit()
          '0x8e19899e', // abandon()
        ],
        keywords: [
          'withdraw_early', 'withdrawearly', 'early_withdraw', 'force_withdraw',
          'forcewithdraw', 'emergency_withdraw', 'emergencywithdraw', 'break_lock',
          'breaklock', 'early_exit', 'earlyexit', 'penalty_withdraw', 'penaltywithdraw',
          'forfeit', 'abandon', 'cancel', 'abort', 'terminate'
        ],
        type: 'withdraw_early'
      },
      // Increase unlock time - Extend stake expiry
      increase_unlock_time: {
        signatures: [
          '0x37f4c750', // increase_unlock_time(uint256)
          '0x2c4e722e', // increaseUnlockTime(uint256)
          '0x4f6ccce7', // extend_lock(uint256)
          '0x7acb7757', // extendLock(uint256)
          '0xa694fc3a', // extend(uint256)
          '0x3ccfd60b', // renew(uint256)
          '0x8e19899e', // prolongate(uint256)
          '0x1249c58b', // defer(uint256)
          '0x40c10f19', // postpone(uint256)
          '0x6057361d', // delay(uint256)
          '0x47e7ef24', // rollover(uint256)
          '0x2e1a7d4d', // continue(uint256)
        ],
        keywords: [
          'increase_unlock_time', 'increaseunlocktime', 'extend_lock', 'extendlock',
          'extend', 'renew', 'prolongate', 'defer', 'postpone', 'delay', 'rollover',
          'continue', 'stretch', 'lengthen', 'expand_duration', 'add_time'
        ],
        type: 'increase_unlock_time'
      }
    };

    // Check method signatures first (most reliable)
    for (const [operation, pattern] of Object.entries(stakingPatterns)) {
      if (pattern.signatures.some(sig => input.toLowerCase().startsWith(sig.toLowerCase()))) {
        result.isStaking = true;
        result.stakingType = pattern.type;
        result.confidence = 0.95;
        result.details.method = 'signature';
        result.details.operation = operation;
        result.details.matchedSignature = pattern.signatures.find(sig => 
          input.toLowerCase().startsWith(sig.toLowerCase())
        );
        break;
      }
    }

    // Check function names if available (medium reliability)
    if (!result.isStaking && functionName) {
      const lowerFunctionName = functionName.toLowerCase();
      for (const [operation, pattern] of Object.entries(stakingPatterns)) {
        if (pattern.keywords.some(keyword => lowerFunctionName.includes(keyword.toLowerCase()))) {
          result.isStaking = true;
          result.stakingType = pattern.type;
          result.confidence = 0.8;
          result.details.method = 'functionName';
          result.details.operation = operation;
          result.details.matchedKeyword = pattern.keywords.find(keyword => 
            lowerFunctionName.includes(keyword.toLowerCase())
          );
          break;
        }
      }
    }

    // Check method ID if available (medium reliability)
    if (!result.isStaking && methodId) {
      for (const [operation, pattern] of Object.entries(stakingPatterns)) {
        if (pattern.signatures.some(sig => sig.toLowerCase() === methodId.toLowerCase())) {
          result.isStaking = true;
          result.stakingType = pattern.type;
          result.confidence = 0.85;
          result.details.method = 'methodId';
          result.details.operation = operation;
          result.details.matchedMethodId = methodId;
          break;
        }
      }
    }

    // Extract unlock time details for relevant operations
    if (result.isStaking && (
      result.stakingType === 'create_lock' || 
      result.stakingType === 'increase_amount' || 
      result.stakingType === 'increase_unlock_time'
    )) {
      const unlockTimeData = extractUnlockTimeFromInput(input, result.stakingType);
      if (unlockTimeData) {
        result.details.unlockTime = unlockTimeData.unlockTime;
        result.details.lockDuration = unlockTimeData.lockDuration;
        result.details.lockDurationDays = unlockTimeData.lockDurationDays;
        result.details.lockDurationHours = unlockTimeData.lockDurationHours;
        result.details.unlockTimestamp = unlockTimeData.unlockTimestamp;
        result.details.extractionPattern = unlockTimeData.pattern;
        result.confidence = Math.min(result.confidence + 0.1, 1.0); // Boost confidence
      }
    }

    // Additional heuristics for escrow contracts (low reliability)
    if (contractType === 'escrow' && !result.isStaking) {
      const value = parseFloat((transaction.value_eth || transaction.value || '0').replace(/,/g, ''));
      const gasUsed = parseInt(transaction.gas || 0);
      
      // Large value transactions in escrow contracts are likely stakes
      if (value > 0) {
        result.isStaking = true;
        result.stakingType = 'create_lock';
        result.confidence = 0.4;
        result.details.method = 'heuristic';
        result.details.reason = 'value_transfer_to_escrow';
        result.details.value = value;
      }
      
      // High gas usage might indicate complex staking operations
      if (gasUsed > 100000) {
        result.confidence = Math.min(result.confidence + 0.1, 1.0);
        result.details.highGasUsage = true;
      }
    }

    // Add chain-specific analysis
    const chainName = transaction.chain || 'Unknown';
    result.details.chain = chainName;
    result.details.analysisTimestamp = new Date().toISOString();

    return result;
  } catch (error) {
    console.error('Error identifying staking transaction:', error);
    return result;
  }
};

export default {
  safeNumber,
  hexToDecimalString,
  formatTokenAmount,
  decodeERC20TransferInput,
  formatTransaction,
  getCurrentBlockNumber,
  isValidAddress,
  identifyStakingTransaction
}; 