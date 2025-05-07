import { isValidAddress } from '../addressUtils';
import { formatTransaction } from '../chainUtils';

export const getName = () => 'SUI';

export const getFullName = () => 'Sui';

export const getExplorerURL = (txHash) => {
  return `https://explorer.sui.io/txblock/${txHash}?network=mainnet`;
};

export const getAddressExplorerURL = (address) => {
  return `https://explorer.sui.io/address/${address}?network=mainnet`;
};

export const validateAddress = (address) => {
  // SUI addresses are 0x followed by 64 hex characters (32 bytes)
  return isValidAddress(address) && address.length === 66;
};

export const getApiUrl = (address) => {
  return `https://fullnode.mainnet.sui.io/` + 
    `rest/objects?owner=${address}`;
};

export const processApiResponse = async (response) => {
  try {
    const data = await response.json();
    if (!data || !data.result) {
      return [];
    }
    
    // Map the SUI objects to the common contract format
    return data.result.map(obj => ({
      name: obj.data?.content?.type || 'Unknown Type',
      address: obj.data?.objectId || '',
      balance: obj.data?.content?.fields?.balance || '0',
      type: 'token',
      chain: 'SUI'
    }));
  } catch (error) {
    console.error('Error processing SUI API response:', error);
    return [];
  }
};

export const getDecodedData = (input, abi) => {
  // SUI doesn't use the same ABI format as EVM chains
  // This would need a custom implementation for SUI
  return null;
};

export const getNetwork = () => {
  return 'mainnet';
};

export const getIcon = () => {
  return 'https://cryptologos.cc/logos/sui-sui-logo.png';
};

/**
 * Fetches SUI transactions for a given address
 * 
 * @param {string} address - The address to fetch transactions for
 * @param {Object} options - Additional options for the API call
 * @returns {Object} - Object containing transactions and metadata
 */
export const fetchSuiTransactions = async (address, options = {}) => {
  try {
    // Check if address is valid
    if (!validateAddress(address)) {
      return {
        transactions: [],
        metadata: {
          success: false,
          message: 'Invalid SUI address'
        }
      };
    }

    // Construct API URL to fetch transactions
    const limit = options.limit || 100;
    const apiUrl = `https://fullnode.mainnet.sui.io/rest/transactions?limit=${limit}&filter={"FromAddress":"${address}"}`;

    // Make API request
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`SUI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || !data.result || !Array.isArray(data.result)) {
      return {
        transactions: [],
        metadata: {
          success: true,
          message: 'No transactions found'
        }
      };
    }

    // Transform SUI transactions into the standard format
    const formattedTransactions = data.result.map(tx => {
      return formatTransaction({
        hash: tx.digest,
        blockNumber: tx.checkpoint || '0',
        timeStamp: Math.floor(tx.timestamp_ms / 1000).toString(),
        from: tx.sender || address,
        to: tx.recipient || '',
        value: tx.amount || '0',
        gasUsed: tx.gas_used || '0',
        isError: tx.status === 'success' ? '0' : '1'
      }, 'SUI');
    });

    return {
      transactions: formattedTransactions,
      metadata: {
        success: true,
        message: `Successfully retrieved ${formattedTransactions.length} transactions`
      }
    };
  } catch (error) {
    console.error('Error fetching SUI transactions:', error);
    return {
      transactions: [],
      metadata: {
        success: false,
        message: error.message
      }
    };
  }
};

export default {
  fetchSuiTransactions
}; 