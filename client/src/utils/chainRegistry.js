/**
 * chainRegistry.js - Central registry for all blockchain configurations
 * This file acts as a single source of truth for chain-specific configurations
 * and makes it easy to add new chains without modifying existing code.
 */

// Import chain-specific API helpers
import { fetchBnbTransactions } from './chains/bnbChain';
import { fetchBaseTransactions } from './chains/baseChain';
import { fetchEthereumTransactions } from './chains/ethereumChain';
import { fetchPolygonTransactions } from './chains/polygonChain';
import { fetchArbitrumTransactions } from './chains/arbitrumChain';
import { fetchOptimismTransactions } from './chains/optimismChain';

/**
 * Chain registry with all supported blockchain configurations
 * To add a new chain, simply add a new entry to this object with the required properties
 */
export const chains = {
  'BNB Chain': {
    id: 'bnb',
    name: 'BNB Chain',
    nativeCurrency: {
      symbol: 'BNB',
      name: 'BNB',
      decimals: 18
    },
    fetchTransactions: fetchBnbTransactions,
    blockExplorerUrl: 'https://bscscan.com',
    apiEndpoint: 'https://api.bscscan.com/api',
    defaultTokenType: 'BEP20',
    color: '#F0B90B', // BNB Chain yellow
    iconUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
    averageBlockTime: 3 // seconds
  },
  'Base': {
    id: 'base',
    name: 'Base',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    fetchTransactions: fetchBaseTransactions,
    blockExplorerUrl: 'https://basescan.org',
    apiEndpoint: 'https://api.basescan.org/api',
    defaultTokenType: 'ETH',
    color: '#0052FF', // Base blue
    iconUrl: 'https://cryptologos.cc/logos/base-base-logo.svg',
    averageBlockTime: 2 // seconds
  },
  'Ethereum': {
    id: 'ethereum',
    name: 'Ethereum',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    fetchTransactions: fetchEthereumTransactions,
    blockExplorerUrl: 'https://etherscan.io',
    apiEndpoint: 'https://api.etherscan.io/api',
    defaultTokenType: 'ERC20',
    color: '#627EEA', // Ethereum blue
    iconUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    averageBlockTime: 12 // seconds
  },
  'Polygon': {
    id: 'polygon',
    name: 'Polygon',
    nativeCurrency: {
      symbol: 'MATIC',
      name: 'Matic',
      decimals: 18
    },
    fetchTransactions: fetchPolygonTransactions,
    blockExplorerUrl: 'https://polygonscan.com',
    apiEndpoint: 'https://api.polygonscan.com/api',
    defaultTokenType: 'MATIC',
    color: '#8247E5', // Polygon purple
    iconUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    averageBlockTime: 2 // seconds
  },
  'Arbitrum': {
    id: 'arbitrum',
    name: 'Arbitrum',
    nativeCurrency: {
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 18
    },
    fetchTransactions: fetchArbitrumTransactions,
    blockExplorerUrl: 'https://arbiscan.io',
    apiEndpoint: 'https://api.arbiscan.io/api',
    defaultTokenType: 'ARB',
    color: '#28A0F0', // Arbitrum blue
    iconUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    averageBlockTime: 0.25 // seconds
  },
  'Optimism': {
    id: 'optimism',
    name: 'Optimism',
    nativeCurrency: {
      symbol: 'OP',
      name: 'Optimism',
      decimals: 18
    },
    fetchTransactions: fetchOptimismTransactions,
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    apiEndpoint: 'https://api-optimistic.etherscan.io/api',
    defaultTokenType: 'OP',
    color: '#FF0420', // Optimism red
    iconUrl: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
    averageBlockTime: 0.5 // seconds
  }
};

/**
 * Get chain configuration by chain name
 * 
 * @param {string} chainName - The name of the chain to get configuration for
 * @returns {Object|null} - The chain configuration or null if not found
 */
export const getChainConfig = (chainName) => {
  return chains[chainName] || null;
};

/**
 * Get all supported chains as an array
 * 
 * @returns {Array} - Array of chain configuration objects
 */
export const getSupportedChains = () => {
  return Object.values(chains);
};

/**
 * Check if a chain is supported
 * 
 * @param {string} chainName - The name of the chain to check
 * @returns {boolean} - Whether the chain is supported
 */
export const isChainSupported = (chainName) => {
  return !!chains[chainName];
};

/**
 * Get the default token type for a chain
 * 
 * @param {string} chainName - The name of the chain
 * @returns {string} - The default token type for the chain
 */
export const getDefaultTokenType = (chainName) => {
  return chains[chainName]?.defaultTokenType || 'TOKEN';
};

/**
 * Format a token value with the appropriate symbol based on the chain
 * 
 * @param {string|number} value - The token value
 * @param {string} chainName - The name of the chain
 * @param {string} tokenSymbol - Optional token symbol to override the default
 * @returns {string} - Formatted token value with symbol
 */
export const formatTokenValueForChain = (value, chainName, tokenSymbol = null) => {
  const chain = chains[chainName];
  
  if (!chain) {
    return `${value} ${tokenSymbol || 'TOKEN'}`;
  }
  
  return `${value} ${tokenSymbol || chain.nativeCurrency.symbol}`;
};

export default chains; 