import React from 'react';
import { isWeb3User } from '../../utils/analyticsHelpers';

// Extended ISO Alpha-2 code to country name map
const countryCodeToName = {
  "US": "United States",
  "IN": "India",
  "DE": "Germany",
  "BR": "Brazil",
  "CA": "Canada",
  "FR": "France",
  "GB": "United Kingdom",
  "AU": "Australia",
  "JP": "Japan",
  "KR": "South Korea",
  "CN": "China",
  "RU": "Russia",
  "IT": "Italy",
  "ES": "Spain",
  "MX": "Mexico",
  "ID": "Indonesia",
  "NG": "Nigeria",
  "PK": "Pakistan",
  "BD": "Bangladesh",
  "AR": "Argentina",
  "CO": "Colombia",
  "ZA": "South Africa",
  "EG": "Egypt",
  "TR": "Turkey",
  "TH": "Thailand",
  "VN": "Vietnam",
  "PH": "Philippines",
  "MY": "Malaysia",
  "SG": "Singapore"
};

const CountryDetail = ({ countryCode, analytics, contractData }) => {
  // Return null if no country selected
  if (!countryCode) {
    return null;
  }
  
  // Get the country name
  const countryName = countryCodeToName[countryCode] || countryCode;
  
  // Convert country code to flag emoji
  const getCountryFlag = (code) => {
    if (!code) return '';
    
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };
  
  // Function to get data for the selected country
  const getCountryData = () => {
    if (!analytics?.sessions || !Array.isArray(analytics.sessions)) {
      return null;
    }
    
    // Filter sessions for the selected country
    const countrySessions = analytics.sessions.filter(
      session => session.country && session.country.toUpperCase() === countryCode
    );
    
    if (countrySessions.length === 0) {
      return null;
    }
    
    // Extract unique users, web3 users, and connected wallets
    const uniqueUsers = new Set();
    const web3Users = new Set();
    const connectedWallets = new Set();
    const walletAddresses = new Set();
    const transactedWallets = new Map(); // Map to store wallet address -> session data for transacted wallets
    
    // Negative values that indicate no wallet
    const noWalletPhrases = [
      'No Wallet Detected', 
      'No Wallet Connected', 
      'Not Connected', 
      'No Chain Detected', 
      'Error'
    ];
    
    // Extract contract wallet addresses
    const contractWallets = new Set();
    if (contractData?.contractTransactions) {
      contractData.contractTransactions.forEach(tx => {
        if (tx.from_address) {
          contractWallets.add(tx.from_address.toLowerCase());
        }
      });
    }
    
    // Process each session
    countrySessions.forEach(session => {
      if (session.userId) {
        uniqueUsers.add(session.userId);
        
        if (isWeb3User(session)) {
          web3Users.add(session.userId);
        }
        
        // Check for wallet connections
        if (session.wallet && 
            session.wallet.walletAddress && 
            session.wallet.walletAddress.trim() !== '' && 
            !noWalletPhrases.includes(session.wallet.walletAddress) &&
            session.wallet.walletAddress.length > 10) {
          
          const walletAddress = session.wallet.walletAddress.toLowerCase();
          connectedWallets.add(session.userId);
          walletAddresses.add(walletAddress);
          
          // Check if this wallet has transacted with the contract
          if (contractWallets.has(walletAddress)) {
            transactedWallets.set(walletAddress, {
              userId: session.userId,
              walletType: session.wallet.walletType || 'Unknown',
              chainName: session.wallet.chainName || 'Unknown',
              startTime: session.startTime
            });
          }
        }
      }
    });
    
    // Get transaction data for the country
    let transactionVolume = 0;
    let transactionCount = 0;
    
    if (contractData?.contractTransactions) {
      transactedWallets.forEach((sessionData, walletAddress) => {
        const walletTxs = contractData.contractTransactions.filter(
          tx => tx.from_address && tx.from_address.toLowerCase() === walletAddress
        );
        
        transactionCount += walletTxs.length;
        
        walletTxs.forEach(tx => {
          if (tx.value_eth) {
            const value = parseFloat(tx.value_eth);
            if (!isNaN(value)) {
              transactionVolume += value;
            }
          }
        });
      });
    }
    
    return {
      uniqueUsers: uniqueUsers.size,
      web3Users: web3Users.size,
      connectedWallets: connectedWallets.size,
      totalSessions: countrySessions.length,
      transactedWallets: Array.from(transactedWallets),
      transactionCount,
      transactionVolume,
      bounceRate: countrySessions.filter(s => s.isBounce).length / countrySessions.length * 100
    };
  };
  
  const countryData = getCountryData();
  
  if (!countryData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available for {countryName}</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getCountryFlag(countryCode)}</span>
          <h3 className="text-lg font-semibold font-montserrat">{countryName}</h3>
        </div>
      </div>
      
      {/* Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Unique Visitors</p>
          <p className="text-lg font-bold">{countryData.uniqueUsers}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Web3 Users</p>
          <p className="text-lg font-bold text-purple-600">{countryData.web3Users}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Connected Wallets</p>
          <p className="text-lg font-bold text-green-600">{countryData.connectedWallets}</p>
        </div>
        <div className="bg-amber-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Transacted Wallets</p>
          <p className="text-lg font-bold text-amber-600">{countryData.transactedWallets.length}</p>
        </div>
      </div>
      
      {/* Additional metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Transactions</p>
          <p className="text-lg font-bold text-blue-600">{countryData.transactionCount}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Transaction Volume</p>
          <p className="text-lg font-bold text-blue-600">
            {countryData.transactionVolume.toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Bounce Rate</p>
          <p className="text-lg font-bold text-blue-600">
            {countryData.bounceRate.toFixed(1)}%
          </p>
        </div>
      </div>
      
      {/* Transacted wallets list */}
      {countryData.transactedWallets.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 font-montserrat">Transacted Wallets</h4>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chain
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {countryData.transactedWallets.map(([address, data], index) => (
                  <tr key={address} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                      {address.substring(0, 6)}...{address.substring(address.length - 4)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {data.walletType}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {data.chainName}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(data.startTime).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryDetail; 