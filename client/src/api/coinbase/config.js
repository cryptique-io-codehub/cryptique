// Coinbase Commerce API configuration
import axios from 'axios';

// These will be populated from environment variables
const COINBASE_API_KEY = process.env.NEXT_PUBLIC_COINBASE_API_KEY || '';
const COINBASE_API_URL = 'https://api.commerce.coinbase.com';

/**
 * Create authenticated Coinbase Commerce API client
 * We'll use a proxy on the server side to protect API keys
 */
export const createCoinbaseClient = () => {
  return axios.create({
    baseURL: '/api/coinbase', // Server proxy endpoint
    headers: {
      'Content-Type': 'application/json',
    }
  });
};

/**
 * Direct Coinbase Commerce client for server-side use only
 * This should NOT be used client-side to avoid exposing API keys
 */
export const createDirectCoinbaseClient = () => {
  return axios.create({
    baseURL: COINBASE_API_URL,
    headers: {
      'X-CC-Api-Key': COINBASE_API_KEY,
      'X-CC-Version': '2018-03-22',
      'Content-Type': 'application/json',
    }
  });
};

export default {
  createCoinbaseClient,
}; 