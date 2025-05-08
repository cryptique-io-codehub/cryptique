import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getChainConfig } from '../utils/chainRegistry';

// Chain Icon component to display chain logos
export const ChainIcon = ({ chainName, size = 24 }) => {
  const chainConfig = getChainConfig(chainName);
  
  if (!chainConfig || !chainConfig.iconUrl) {
    // Fallback for unknown chains
    return (
      <div 
        className="inline-flex items-center justify-center rounded-full bg-gray-200"
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold text-gray-500">
          {chainName?.substring(0, 1) || '?'}
        </span>
      </div>
    );
  }
  
  return (
    <img 
      src={chainConfig.iconUrl} 
      alt={`${chainName} logo`} 
      className="rounded-full"
      style={{ width: size, height: size }}
      onError={(e) => {
        // Fallback if image fails to load
        e.target.style.display = 'none';
        e.target.parentNode.innerHTML = `<div class="inline-flex items-center justify-center rounded-full bg-gray-200" style="width: ${size}px; height: ${size}px"><span class="text-xs font-bold text-gray-500">${chainName?.substring(0, 1) || '?'}</span></div>`;
      }}
    />
  );
};

/**
 * ChainBanner - A reusable component to display chain-specific information at the top of on-chain screens
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.showDemoData - Whether to show demo data or real data
 * @param {boolean} props.isLoading - Whether data is currently loading
 * @param {boolean} props.isUpdating - Whether data is currently being updated
 * @param {string} props.loadingStatus - Current loading status message
 * @param {Object} props.contract - Selected contract data
 * @param {Object} props.contractData - Processed contract data
 * @param {Array} props.transactions - Transaction data
 * @param {Object} props.fetchError - Error that occurred during data fetch
 * @returns {JSX.Element} - The chain banner component
 */
const ChainBanner = ({ 
  showDemoData,
  isLoading,
  isUpdating,
  loadingStatus,
  contract,
  contractData,
  transactions = [],
  fetchError = null
}) => {
  // Build the address link for block explorer
  const getBlockExplorerLink = () => {
    if (showDemoData || !contract) return '#';
    
    const chainConfig = getChainConfig(contract.blockchain);
    const blockExplorerUrl = contractData?.contractInfo?.blockExplorerUrl || chainConfig?.blockExplorerUrl || 'https://etherscan.io';
    return `${blockExplorerUrl}/address/${contract.address}`;
  };

  // Check if there's a rate limit error
  const isRateLimited = fetchError && fetchError.response && fetchError.response.status === 429;

  // Display rate limit error banner
  if (isRateLimited) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 rounded">
        <p className="text-sm font-bold">
          Rate limit exceeded (429)
        </p>
        <p className="text-sm">
          The API is currently rate limited. Using cached data when available. Please wait a moment before trying again.
        </p>
      </div>
    );
  }

  if (showDemoData) {
    return (
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 rounded">
        <p className="text-sm">
          <span className="font-bold">Using demo data.</span> Select a smart contract from the dropdown to view real data.
        </p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mb-4 rounded">
        <p className="text-sm">
          <span className="font-bold">Loading transaction data...</span> Please wait while we process the data.
        </p>
      </div>
    );
  }
  
  if (isUpdating) {
    return (
      <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-2 mb-4 rounded">
        <p className="text-sm">
          <span className="font-bold">Updating transactions:</span> {loadingStatus}
        </p>
      </div>
    );
  }
  
  if (!contract) {
    return (
      <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-700 p-2 mb-4 rounded">
        <p className="text-sm">
          <span className="font-bold">No contract selected.</span> Please select a contract to view data.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-2 mb-4 rounded flex items-center justify-between">
      <div className="flex items-center">
        <ChainIcon chainName={contract.blockchain} size={20} />
        <p className="text-sm ml-2">
          <span className="font-bold">Using real data for:</span> {contract.name} ({contract.tokenSymbol || 'Unknown'}) 
          on {contract.blockchain}. {transactions.length} transactions loaded.
        </p>
      </div>
      <a 
        href={getBlockExplorerLink()} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm flex items-center text-blue-600 hover:text-blue-800"
      >
        View on Explorer <ExternalLink size={14} className="ml-1" />
      </a>
    </div>
  );
};

export default ChainBanner; 